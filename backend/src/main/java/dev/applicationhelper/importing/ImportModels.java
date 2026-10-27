package dev.applicationhelper.importing;
import dev.applicationhelper.api.ApiModels.VacancyInput;
import dev.applicationhelper.model.WorkMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
public final class ImportModels {
    private ImportModels() {}
    public record ImportRequest(@NotBlank @Pattern(regexp="[a-z0-9][a-z0-9._-]{1,59}") String source,
        @NotNull @Size(min=1,max=500) List<@Valid ImportItem> vacancies) {}
    public record ImportItem(@NotBlank @Size(max=200) String externalId,
        @NotBlank @Size(max=200) String title, @NotBlank @Size(max=200) String company,
        @Size(max=200) String location, @NotNull WorkMode workMode,
        @Size(max=100) String experience, @Size(max=200) String salary,
        @NotBlank @Size(max=30000) String description, @Size(max=2000) String sourceUrl,
        @NotNull @Size(max=20) List<@NotBlank @Size(max=40) String> technologies) {
        public VacancyInput input() {
            return new VacancyInput(title, company, location, workMode, experience, salary, description, sourceUrl, technologies);
        }
    }
    public record ImportResult(int created, int updated, int processed, List<Long> vacancyIds) {}
}
