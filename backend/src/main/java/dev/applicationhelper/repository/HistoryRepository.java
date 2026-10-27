package dev.applicationhelper.repository;

import dev.applicationhelper.model.StatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HistoryRepository extends JpaRepository<StatusHistory, Long> {
    List<StatusHistory> findByApplicationIdOrderByChangedAtAscIdAsc(Long applicationId);
}
