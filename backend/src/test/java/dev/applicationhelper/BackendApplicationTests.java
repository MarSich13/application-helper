package dev.applicationhelper;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.*;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.*;
import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class BackendApplicationTests {
    @Container static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");
    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
    @Value("${local.server.port}") int port;
    @Autowired ObjectMapper json;

    HttpClient client() {
        return HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
            .connectTimeout(Duration.ofSeconds(10)).build();
    }
    URI uri(String path) { return URI.create("http://localhost:" + port + path); }
    JsonNode body(HttpResponse<String> response) { return json.readTree(response.body()); }
    HttpResponse<String> request(HttpClient client, String method, String path, Object value) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(uri(path)).timeout(Duration.ofSeconds(15));
        if (!method.equals("GET")) {
            JsonNode csrf = body(client.send(HttpRequest.newBuilder(uri("/api/auth/csrf")).GET().build(), HttpResponse.BodyHandlers.ofString()));
            builder.header(csrf.get("headerName").asText(), csrf.get("token").asText());
        }
        if (value != null) builder.header("Content-Type", "application/json");
        return client.send(builder.method(method, value == null ? HttpRequest.BodyPublishers.noBody() :
            HttpRequest.BodyPublishers.ofString(json.writeValueAsString(value))).build(), HttpResponse.BodyHandlers.ofString());
    }
    HttpClient account() throws Exception {
        HttpClient client = client();
        String email = "test-" + UUID.randomUUID() + "@example.com";
        assertThat(request(client, "POST", "/api/auth/register",
            Map.of("email", email, "displayName", "Test User", "password", "TestPassword123!")).statusCode()).isEqualTo(201);
        JsonNode csrf = body(request(client, "GET", "/api/auth/csrf", null));
        HttpResponse<String> login = client.send(HttpRequest.newBuilder(uri("/api/auth/login"))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .header(csrf.get("headerName").asText(), csrf.get("token").asText())
            .POST(HttpRequest.BodyPublishers.ofString("email=" + URLEncoder.encode(email, java.nio.charset.StandardCharsets.UTF_8)
                + "&password=TestPassword123!")).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(204);
        return client;
    }
    Map<String, Object> vacancyInput(String title) {
        return Map.of("title", title, "company", "Test Company", "location", "Kyiv", "workMode", "REMOTE",
            "experience", "Junior", "salary", "€2,000–3,000", "description", "Build useful software.",
            "sourceUrl", "https://example.com/jobs/test", "technologies", List.of("Java", "React"));
    }
    long vacancy(HttpClient client) throws Exception {
        HttpResponse<String> response = request(client, "POST", "/api/vacancies", vacancyInput("Job " + UUID.randomUUID()));
        assertThat(response.statusCode()).isEqualTo(201);
        return body(response).get("id").asLong();
    }

    @Test void authenticationAndCsrfAreRequired() throws Exception {
        HttpClient anonymous = client();
        assertThat(request(anonymous, "GET", "/api/vacancies", null).statusCode()).isEqualTo(401);
        HttpClient signedIn = account();
        HttpResponse<String> withoutCsrf = signedIn.send(HttpRequest.newBuilder(uri("/api/vacancies"))
            .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(vacancyInput("CSRF"))))
            .build(), HttpResponse.BodyHandlers.ofString());
        assertThat(withoutCsrf.statusCode()).isEqualTo(403);
        assertThat(request(signedIn, "POST", "/api/auth/logout", null).statusCode()).isEqualTo(204);
        assertThat(request(signedIn, "GET", "/api/auth/me", null).statusCode()).isEqualTo(401);
    }

    @Test void usersCannotReadOrChangeOtherUsersApplications() throws Exception {
        HttpClient alice = account(), bob = account();
        long vacancyId = vacancy(alice);
        JsonNode application = body(request(alice, "PUT", "/api/vacancies/" + vacancyId + "/application", null));
        long applicationId = application.get("id").asLong();
        assertThat(request(alice, "PUT", "/api/applications/" + applicationId + "/notes",
            Map.of("notes", "Private interview notes", "version", 0)).statusCode()).isEqualTo(200);
        assertThat(request(bob, "GET", "/api/applications/" + applicationId, null).statusCode()).isEqualTo(404);
        assertThat(request(bob, "PUT", "/api/applications/" + applicationId + "/notes",
            Map.of("notes", "overwrite", "version", 1)).statusCode()).isEqualTo(404);
        assertThat(request(bob, "PUT", "/api/applications/" + applicationId + "/status",
            Map.of("status", "APPLIED", "version", 1)).statusCode()).isEqualTo(404);
        JsonNode detail = body(request(bob, "GET", "/api/vacancies/" + vacancyId, null));
        assertThat(detail.get("application").isNull()).isTrue();
        assertThat(detail.get("vacancy").get("application").isNull()).isTrue();
        assertThat(body(request(bob, "GET", "/api/dashboard", null)).get("tracked").asLong()).isZero();
    }

    @Test void trackingAndStatusRetriesAreIdempotentAndNotesDoNotCreateHistory() throws Exception {
        HttpClient client = account();
        long vacancyId = vacancy(client);
        JsonNode initial = body(request(client, "PUT", "/api/vacancies/" + vacancyId + "/application", null));
        long id = initial.get("id").asLong();
        JsonNode retry = body(request(client, "PUT", "/api/vacancies/" + vacancyId + "/application", null));
        assertThat(retry.get("id").asLong()).isEqualTo(id);
        assertThat(retry.get("history").size()).isEqualTo(1);
        JsonNode applied = body(request(client, "PUT", "/api/applications/" + id + "/status",
            Map.of("status", "APPLIED", "version", 0)));
        assertThat(applied.get("status").asText()).isEqualTo("APPLIED");
        assertThat(applied.get("history").size()).isEqualTo(2);
        JsonNode repeated = body(request(client, "PUT", "/api/applications/" + id + "/status",
            Map.of("status", "APPLIED", "version", 0)));
        assertThat(repeated.get("history").size()).isEqualTo(2);
        long version = repeated.get("version").asLong();
        JsonNode saved = body(request(client, "PUT", "/api/applications/" + id + "/notes",
            Map.of("notes", "Contact recruiter", "version", version)));
        assertThat(saved.get("history").size()).isEqualTo(2);
        assertThat(saved.get("version").asLong()).isEqualTo(version + 1);
        assertThat(request(client, "PUT", "/api/applications/" + id + "/notes",
            Map.of("notes", "Stale overwrite", "version", version)).statusCode()).isEqualTo(409);
        assertThat(request(client, "PUT", "/api/applications/" + id + "/status",
            Map.of("status", "ACCEPTED", "version", version + 1)).statusCode()).isEqualTo(409);
        JsonNode finalState = body(request(client, "GET", "/api/applications/" + id, null));
        assertThat(finalState.get("notes").asText()).isEqualTo("Contact recruiter");
        assertThat(finalState.get("status").asText()).isEqualTo("APPLIED");
    }

    @Test void concurrentTrackingCreatesOnlyOneApplicationAndOneInitialHistoryEntry() throws Exception {
        HttpClient client = account();
        long vacancyId = vacancy(client);
        var futures = java.util.stream.IntStream.range(0, 4).mapToObj(index ->
            CompletableFuture.supplyAsync(() -> {
                try { return request(client, "PUT", "/api/vacancies/" + vacancyId + "/application", null); }
                catch (Exception exception) { throw new RuntimeException(exception); }
            })).toList();
        Set<Long> ids = new HashSet<>();
        for (var future : futures) {
            var response = future.join();
            assertThat(response.statusCode()).isEqualTo(200);
            ids.add(body(response).get("id").asLong());
        }
        assertThat(ids).hasSize(1);
        assertThat(body(request(client, "GET", "/api/applications/" + ids.iterator().next(), null)).get("history").size()).isEqualTo(1);
    }


    Map<String, Object> importPayload(String source, String description) {
        Map<String, Object> item = new HashMap<>(vacancyInput("Imported Java Developer"));
        item.put("externalId", "external-42"); item.put("description", description);
        return Map.of("source", source, "vacancies", List.of(item));
    }

    @Test void repeatedImportsUpdateMetadataAndKeepPrivateStatusNotesAndHistory() throws Exception {
        HttpClient client = account();
        String source = "import-" + UUID.randomUUID();
        JsonNode first = body(request(client, "POST", "/api/imports", importPayload(source, "Original description")));
        assertThat(first.get("created").asInt()).isEqualTo(1);
        long vacancyId = first.get("vacancyIds").get(0).asLong();
        JsonNode tracked = body(request(client, "PUT", "/api/vacancies/" + vacancyId + "/application", null));
        long applicationId = tracked.get("id").asLong();
        JsonNode applied = body(request(client, "PUT", "/api/applications/" + applicationId + "/status",
            Map.of("status", "APPLIED", "version", 0)));
        request(client, "PUT", "/api/applications/" + applicationId + "/notes",
            Map.of("notes", "Keep my notes", "version", applied.get("version").asLong()));
        JsonNode second = body(request(client, "POST", "/api/imports", importPayload(source, "Updated description")));
        assertThat(second.get("created").asInt()).isZero();
        assertThat(second.get("updated").asInt()).isEqualTo(1);
        assertThat(second.get("vacancyIds").get(0).asLong()).isEqualTo(vacancyId);
        JsonNode detail = body(request(client, "GET", "/api/vacancies/" + vacancyId, null));
        assertThat(detail.get("vacancy").get("description").asText()).isEqualTo("Updated description");
        assertThat(detail.get("application").get("notes").asText()).isEqualTo("Keep my notes");
        assertThat(detail.get("application").get("status").asText()).isEqualTo("APPLIED");
        assertThat(detail.get("application").get("history").size()).isEqualTo(2);
    }

    @Test void concurrentImportsOfTheSameSourceDoNotCreateDuplicates() throws Exception {
        HttpClient client = account();
        String source = "race-" + UUID.randomUUID();
        var futures = java.util.stream.IntStream.range(0, 3).mapToObj(index -> CompletableFuture.supplyAsync(() -> {
            try { return request(client, "POST", "/api/imports", importPayload(source, "Concurrent import")); }
            catch (Exception exception) { throw new RuntimeException(exception); }
        })).toList();
        Set<Long> ids = new HashSet<>();
        int created = 0;
        for (var future : futures) {
            var response = future.join();
            assertThat(response.statusCode()).isEqualTo(200);
            JsonNode result = body(response);
            ids.add(result.get("vacancyIds").get(0).asLong()); created += result.get("created").asInt();
        }
        assertThat(ids).hasSize(1);
        assertThat(created).isEqualTo(1);
    }

    @Test void aFailedImportRollsBackEarlierItemsInTheSameBatch() throws Exception {
        HttpClient client = account();
        String source = "atomic-" + UUID.randomUUID();
        Map<String, Object> valid = new HashMap<>(vacancyInput("Atomic " + source));
        valid.put("externalId", "valid");
        Map<String, Object> invalid = new HashMap<>(vacancyInput("Invalid URL"));
        invalid.put("externalId", "invalid"); invalid.put("sourceUrl", "file:///private");
        assertThat(request(client, "POST", "/api/imports", Map.of("source", source, "vacancies", List.of(valid, invalid))).statusCode()).isEqualTo(400);
        JsonNode retry = body(request(client, "POST", "/api/imports", Map.of("source", source, "vacancies", List.of(valid))));
        assertThat(retry.get("created").asInt()).isEqualTo(1);
    }


    @Test void concurrentDifferentStatusUpdatesDoNotLoseHistoryOrOverwriteNewerState() throws Exception {
        HttpClient client = account();
        long vacancyId = vacancy(client);
        long id = body(request(client, "PUT", "/api/vacancies/" + vacancyId + "/application", null)).get("id").asLong();
        var futures = List.of("APPLIED", "WITHDRAWN").stream().map(status -> CompletableFuture.supplyAsync(() -> {
            try { return request(client, "PUT", "/api/applications/" + id + "/status", Map.of("status", status, "version", 0)); }
            catch (Exception exception) { throw new RuntimeException(exception); }
        })).toList();
        List<Integer> statuses = futures.stream().map(future -> future.join().statusCode()).sorted().toList();
        assertThat(statuses).containsExactly(200, 409);
        JsonNode current = body(request(client, "GET", "/api/applications/" + id, null));
        assertThat(current.get("history").size()).isEqualTo(2);
        assertThat(current.get("version").asLong()).isEqualTo(1);
    }

    @Test void nullAndDuplicateImportItemsAreValidationErrors() throws Exception {
        HttpClient client = account();
        assertThat(request(client, "POST", "/api/imports", Map.of("source", "null-example",
            "vacancies", Arrays.asList((Object) null))).statusCode()).isEqualTo(400);
        Map<String, Object> item = new HashMap<>(vacancyInput("Duplicate"));
        item.put("externalId", "same-id");
        assertThat(request(client, "POST", "/api/imports", Map.of("source", "duplicate-example",
            "vacancies", List.of(item, item))).statusCode()).isEqualTo(400);
    }

    @Test void searchesAreFilteredAndPaginatedAndInvalidInputIsRejected() throws Exception {
        HttpClient client = account();
        String title = "Unique-" + UUID.randomUUID();
        assertThat(request(client, "POST", "/api/vacancies", vacancyInput(title)).statusCode()).isEqualTo(201);
        JsonNode page = body(request(client, "GET", "/api/vacancies?q=" + title + "&technology=java&workMode=REMOTE&size=1", null));
        assertThat(page.get("totalElements").asLong()).isEqualTo(1);
        assertThat(page.get("items").size()).isEqualTo(1);
        assertThat(request(client, "GET", "/api/vacancies?size=101", null).statusCode()).isEqualTo(400);
        assertThat(request(client, "GET", "/api/vacancies?sort=invalid", null).statusCode()).isEqualTo(400);
        Map<String, Object> invalid = new HashMap<>(vacancyInput("Invalid"));
        invalid.put("title", "");
        HttpResponse<String> validation = request(client, "POST", "/api/vacancies", invalid);
        assertThat(validation.statusCode()).isEqualTo(400);
        assertThat(body(validation).get("fields").has("title")).isTrue();
        invalid = new HashMap<>(vacancyInput("Unsafe URL"));
        invalid.put("sourceUrl", "javascript:alert(1)");
        assertThat(request(client, "POST", "/api/vacancies", invalid).statusCode()).isEqualTo(400);
    }
}
