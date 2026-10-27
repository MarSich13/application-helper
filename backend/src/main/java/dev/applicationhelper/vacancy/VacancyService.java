package dev.applicationhelper.vacancy;
import dev.applicationhelper.api.*;
import dev.applicationhelper.api.ApiModels.*;
import dev.applicationhelper.model.*;
import dev.applicationhelper.repository.*;
import jakarta.persistence.criteria.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
@Service
public class VacancyService {
    private final VacancyRepository vacancies;
    private final ApplicationRepository applications;
    private final HistoryRepository history;
    public VacancyService(VacancyRepository vacancies, ApplicationRepository applications, HistoryRepository history) {
        this.vacancies = vacancies; this.applications = applications; this.history = history;
    }
    @Transactional(readOnly = true)
    public PageResult<VacancyView> search(long userId, String q, String technology, String location,
            WorkMode workMode, String experience, String status, boolean tracked, String sort, int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw ApiException.badRequest("Invalid page or page size.");
        ApplicationStatus applicationStatus = null;
        if (status != null && !status.isBlank() && !status.equals("UNTRACKED")) {
            try { applicationStatus = ApplicationStatus.valueOf(status); }
            catch (IllegalArgumentException exception) { throw ApiException.badRequest("Unknown application status."); }
        }
        final ApplicationStatus wantedStatus = applicationStatus;
        Specification<Vacancy> specification = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String pattern = pattern(q);
                predicates.add(cb.or(cb.like(cb.lower(root.get("title")), pattern, '\\'),
                    cb.like(cb.lower(root.get("company")), pattern, '\\'),
                    cb.like(cb.lower(root.get("description")), pattern, '\\')));
            }
            if (location != null && !location.isBlank()) predicates.add(cb.like(cb.lower(root.get("location")), pattern(location), '\\'));
            if (experience != null && !experience.isBlank()) predicates.add(cb.like(cb.lower(root.get("experience")), pattern(experience), '\\'));
            if (workMode != null) predicates.add(cb.equal(root.get("workMode"), workMode));
            if (technology != null && !technology.isBlank()) {
                query.distinct(true);
                predicates.add(cb.equal(cb.lower(root.join("technologies")), technology.trim().toLowerCase(Locale.ROOT)));
            }
            if (tracked || wantedStatus != null || "UNTRACKED".equals(status)) {
                Subquery<Long> subquery = query.subquery(Long.class);
                Root<JobApplication> application = subquery.from(JobApplication.class);
                List<Predicate> conditions = new ArrayList<>(List.of(cb.equal(application.get("user").get("id"), userId),
                    cb.equal(application.get("vacancy").get("id"), root.get("id"))));
                if (wantedStatus != null) conditions.add(cb.equal(application.get("status"), wantedStatus));
                subquery.select(application.get("id")).where(conditions.toArray(Predicate[]::new));
                predicates.add("UNTRACKED".equals(status) ? cb.not(cb.exists(subquery)) : cb.exists(subquery));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        Sort ordering = switch (sort == null ? "newest" : sort) {
            case "newest" -> Sort.by(Sort.Direction.DESC, "createdAt", "id");
            case "oldest" -> Sort.by("createdAt", "id");
            case "company" -> Sort.by("company", "id");
            case "title" -> Sort.by("title", "id");
            default -> throw ApiException.badRequest("Unknown sort order.");
        };
        Page<Vacancy> result = vacancies.findAll(specification, PageRequest.of(page, size, ordering));
        Map<Long, JobApplication> own = result.isEmpty() ? Map.of() : applications
            .findByUserIdAndVacancyIdIn(userId, result.getContent().stream().map(Vacancy::getId).toList())
            .stream().collect(Collectors.toMap(item -> item.getVacancy().getId(), Function.identity()));
        return new PageResult<>(result.stream().map(item -> Views.vacancy(item, own.get(item.getId()))).toList(),
            page, size, result.getTotalElements(), result.getTotalPages());
    }
    @Transactional(readOnly = true)
    public VacancyDetail detail(long userId, long id) {
        Vacancy vacancy = vacancies.findById(id).orElseThrow(ApiException::notFound);
        JobApplication application = applications.findByUserIdAndVacancyId(userId, id).orElse(null);
        return new VacancyDetail(Views.vacancy(vacancy, application), application == null ? null :
            Views.application(application, history.findByApplicationIdOrderByChangedAtAscIdAsc(application.getId())));
    }
    @Transactional
    public VacancyView create(VacancyInput input) {
        Vacancy vacancy = new Vacancy();
        vacancy.setSource("manual"); vacancy.setExternalId(UUID.randomUUID().toString());
        vacancy.setCreatedAt(Instant.now()); apply(vacancy, input);
        return Views.vacancy(vacancies.saveAndFlush(vacancy), null);
    }
    public static void apply(Vacancy vacancy, VacancyInput input) {
        vacancy.setTitle(input.title().trim()); vacancy.setCompany(input.company().trim());
        vacancy.setLocation(clean(input.location())); vacancy.setWorkMode(input.workMode());
        vacancy.setExperience(clean(input.experience())); vacancy.setSalary(clean(input.salary()));
        vacancy.setDescription(input.description().trim());
        String url = clean(input.sourceUrl());
        if (!url.isEmpty()) {
            try {
                URI uri = URI.create(url);
                if (!(uri.getScheme().equalsIgnoreCase("http") || uri.getScheme().equalsIgnoreCase("https")) || uri.getHost() == null)
                    throw new IllegalArgumentException();
            } catch (RuntimeException exception) { throw ApiException.badRequest("Source URL must be an absolute HTTP or HTTPS URL."); }
        }
        vacancy.setSourceUrl(url.isEmpty() ? null : url);
        vacancy.getTechnologies().clear();
        input.technologies().forEach(item -> vacancy.getTechnologies().add(item.trim().toLowerCase(Locale.ROOT)));
        vacancy.setUpdatedAt(Instant.now());
    }
    private static String clean(String input) { return input == null ? "" : input.trim(); }
    private static String pattern(String input) {
        return "%" + input.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
