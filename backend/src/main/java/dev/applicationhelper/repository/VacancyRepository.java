package dev.applicationhelper.repository;

import dev.applicationhelper.model.Vacancy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.Optional;

public interface VacancyRepository extends JpaRepository<Vacancy, Long>, JpaSpecificationExecutor<Vacancy> {
    Optional<Vacancy> findBySourceAndExternalId(String source, String externalId);
}
