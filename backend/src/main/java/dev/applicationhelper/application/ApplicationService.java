package dev.applicationhelper.application;
import dev.applicationhelper.api.*;
import dev.applicationhelper.api.ApiModels.*;
import dev.applicationhelper.model.*;
import dev.applicationhelper.repository.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
@Service
public class ApplicationService {
    private final ApplicationRepository applications;
    private final VacancyRepository vacancies;
    private final HistoryRepository history;
    private final JdbcTemplate jdbc;
    public ApplicationService(ApplicationRepository applications, VacancyRepository vacancies, HistoryRepository history, JdbcTemplate jdbc) {
        this.applications = applications; this.vacancies = vacancies; this.history = history; this.jdbc = jdbc;
    }
    @Transactional
    public ApplicationView track(long userId, long vacancyId) {
        if (!vacancies.existsById(vacancyId)) throw ApiException.notFound();
        int inserted = jdbc.update("""
            INSERT INTO applications (user_id,vacancy_id,status,notes,version,created_at,status_changed_at)
            VALUES (?,?,'SAVED','',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
            ON CONFLICT (user_id,vacancy_id) DO NOTHING
            """, userId, vacancyId);
        JobApplication application = applications.findByUserIdAndVacancyId(userId, vacancyId).orElseThrow(ApiException::notFound);
        if (inserted == 1) history.saveAndFlush(new StatusHistory(application, null, ApplicationStatus.SAVED, application.getCreatedAt()));
        return view(application);
    }
    @Transactional(readOnly = true)
    public ApplicationView get(long userId, long id) {
        return view(applications.findByIdAndUserId(id, userId).orElseThrow(ApiException::notFound));
    }
    @Transactional
    public ApplicationView status(long userId, long id, StatusRequest input) {
        JobApplication application = ownedForUpdate(userId, id);
        if (application.getStatus() == input.status()) return view(application);
        checkVersion(application, input.version());
        if (!application.getStatus().nextStatuses().contains(input.status()))
            throw ApiException.conflict("Cannot move from " + application.getStatus() + " to " + input.status() + ".");
        ApplicationStatus previous = application.getStatus();
        Instant now = Instant.now();
        application.setStatus(input.status()); application.setStatusChangedAt(now);
        if (input.status() == ApplicationStatus.APPLIED) application.setAppliedAt(now);
        if (input.status() == ApplicationStatus.SAVED) application.setAppliedAt(null);
        history.save(new StatusHistory(application, previous, input.status(), now));
        applications.flush();
        return view(application);
    }
    @Transactional
    public ApplicationView notes(long userId, long id, NotesRequest input) {
        JobApplication application = ownedForUpdate(userId, id);
        if (application.getNotes().equals(input.notes())) return view(application);
        checkVersion(application, input.version());
        application.setNotes(input.notes()); applications.flush();
        return view(application);
    }
    @Transactional(readOnly = true)
    public DashboardView dashboard(long userId) {
        List<JobApplication> own = applications.findByUserId(userId);
        Map<ApplicationStatus, Long> counts = new EnumMap<>(ApplicationStatus.class);
        for (ApplicationStatus status : ApplicationStatus.values()) counts.put(status, 0L);
        own.forEach(item -> counts.merge(item.getStatus(), 1L, Long::sum));
        long active = own.stream().filter(item -> Set.of(ApplicationStatus.SAVED, ApplicationStatus.APPLIED,
            ApplicationStatus.INTERVIEW, ApplicationStatus.OFFER).contains(item.getStatus())).count();
        Instant since = Instant.now().minus(7, ChronoUnit.DAYS);
        long recent = own.stream().filter(item -> item.getAppliedAt() != null && item.getAppliedAt().isAfter(since)).count();
        return new DashboardView(vacancies.count(), own.size(), active, recent,
            counts.get(ApplicationStatus.OFFER) + counts.get(ApplicationStatus.ACCEPTED), counts);
    }
    private JobApplication ownedForUpdate(long userId, long id) {
        return applications.findOwnedForUpdate(id, userId).orElseThrow(ApiException::notFound);
    }
    private void checkVersion(JobApplication application, long expected) {
        if (application.getVersion() != expected)
            throw ApiException.conflict("This application was changed in another tab. Refresh before saving.");
    }
    private ApplicationView view(JobApplication application) {
        return Views.application(application, history.findByApplicationIdOrderByChangedAtAscIdAsc(application.getId()));
    }
}
