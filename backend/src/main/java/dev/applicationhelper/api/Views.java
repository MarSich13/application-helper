package dev.applicationhelper.api;
import dev.applicationhelper.api.ApiModels.*;
import dev.applicationhelper.model.*;
import java.util.List;
public final class Views {
    private Views() {}
    public static UserView user(AppUser user) { return new UserView(user.getId(), user.getEmail(), user.getDisplayName()); }
    public static VacancyView vacancy(Vacancy vacancy, JobApplication application) {
        return new VacancyView(vacancy.getId(), vacancy.getTitle(), vacancy.getCompany(), vacancy.getLocation(),
            vacancy.getWorkMode(), vacancy.getExperience(), vacancy.getSalary(), vacancy.getDescription(),
            vacancy.getSourceUrl(), vacancy.getSource(), vacancy.getTechnologies().stream().sorted().toList(),
            vacancy.getCreatedAt(), vacancy.getUpdatedAt(), application == null ? null :
            new ApplicationSummary(application.getId(), application.getStatus(), application.getVersion(), application.getStatusChangedAt()));
    }
    public static ApplicationView application(JobApplication application, List<StatusHistory> history) {
        return new ApplicationView(application.getId(), application.getVacancy().getId(), application.getStatus(),
            application.getNotes(), application.getVersion(), application.getCreatedAt(), application.getStatusChangedAt(),
            application.getAppliedAt(), application.getStatus().nextStatuses().stream().sorted().toList(),
            history.stream().map(item -> new HistoryView(item.getId(), item.getFromStatus(), item.getToStatus(), item.getChangedAt())).toList());
    }
}
