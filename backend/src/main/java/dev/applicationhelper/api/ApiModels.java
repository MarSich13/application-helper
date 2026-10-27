package dev.applicationhelper.api;
import dev.applicationhelper.model.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public final class ApiModels {
    private ApiModels() {}
    public record UserView(Long id, String email, String displayName) {}
    public record RegisterRequest(@NotBlank @Email @Size(max=254) String email,
        @NotBlank @Size(min=2,max=80) String displayName, @NotBlank @Size(min=10,max=72) String password) {}
    public record VacancyInput(
        @NotBlank @Size(max=200) String title, @NotBlank @Size(max=200) String company,
        @Size(max=200) String location, @NotNull WorkMode workMode,
        @Size(max=100) String experience, @Size(max=200) String salary,
        @NotBlank @Size(max=30000) String description, @Size(max=2000) String sourceUrl,
        @NotNull @Size(max=20) List<@NotBlank @Size(max=40) String> technologies) {}
    public record ApplicationSummary(Long id, ApplicationStatus status, long version, Instant statusChangedAt) {}
    public record VacancyView(Long id, String title, String company, String location, WorkMode workMode,
        String experience, String salary, String description, String sourceUrl, String source,
        List<String> technologies, Instant createdAt, Instant updatedAt, ApplicationSummary application) {}
    public record HistoryView(Long id, ApplicationStatus fromStatus, ApplicationStatus toStatus, Instant changedAt) {}
    public record ApplicationView(Long id, Long vacancyId, ApplicationStatus status, String notes, long version,
        Instant createdAt, Instant statusChangedAt, Instant appliedAt, List<ApplicationStatus> allowedTransitions,
        List<HistoryView> history) {}
    public record VacancyDetail(VacancyView vacancy, ApplicationView application) {}
    public record PageResult<T>(List<T> items, int page, int size, long totalElements, int totalPages) {}
    public record StatusRequest(@NotNull ApplicationStatus status, @NotNull @Min(0) Long version) {}
    public record NotesRequest(@NotNull @Size(max=10000) String notes, @NotNull @Min(0) Long version) {}
    public record DashboardView(long totalVacancies, long tracked, long active, long appliedThisWeek,
                                long offers, Map<ApplicationStatus, Long> byStatus) {}
}
