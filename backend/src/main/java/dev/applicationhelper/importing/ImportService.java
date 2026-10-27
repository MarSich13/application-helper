package dev.applicationhelper.importing;
import dev.applicationhelper.api.ApiException;
import dev.applicationhelper.importing.ImportModels.*;
import dev.applicationhelper.model.Vacancy;
import dev.applicationhelper.repository.VacancyRepository;
import dev.applicationhelper.vacancy.VacancyService;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;
@Service
public class ImportService {
    private final VacancyRepository vacancies;
    private final JdbcTemplate jdbc;
    public ImportService(VacancyRepository vacancies, JdbcTemplate jdbc) { this.vacancies = vacancies; this.jdbc = jdbc; }
    @Transactional
    public ImportResult importVacancies(ImportRequest input) {
        if ("manual".equals(input.source())) throw ApiException.badRequest("The source 'manual' is reserved.");
        Set<String> seen = new HashSet<>();
        for (ImportItem item : input.vacancies()) {
            if (!seen.add(item.externalId().trim())) throw ApiException.badRequest("Duplicate externalId in this import: " + item.externalId());
        }
        // Serialize same-source imports for the find-or-insert step. The transaction releases the lock automatically.
        jdbc.query("SELECT pg_advisory_xact_lock(hashtext(?))", (ResultSetExtractor<Void>) result -> null, input.source());
        int created = 0, updated = 0;
        List<Long> ids = new ArrayList<>();
        for (ImportItem item : input.vacancies()) {
            Vacancy vacancy = vacancies.findBySourceAndExternalId(input.source(), item.externalId().trim()).orElse(null);
            if (vacancy == null) {
                vacancy = new Vacancy(); vacancy.setSource(input.source()); vacancy.setExternalId(item.externalId().trim());
                vacancy.setCreatedAt(Instant.now()); created++;
            } else updated++;
            VacancyService.apply(vacancy, item.input());
            ids.add(vacancies.saveAndFlush(vacancy).getId());
        }
        return new ImportResult(created, updated, input.vacancies().size(), ids);
    }
}
