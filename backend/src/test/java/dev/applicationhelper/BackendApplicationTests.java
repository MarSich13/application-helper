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
