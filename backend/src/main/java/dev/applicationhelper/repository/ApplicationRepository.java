package dev.applicationhelper.repository;

import dev.applicationhelper.model.JobApplication;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<JobApplication, Long> {
    Optional<JobApplication> findByIdAndUserId(Long id, Long userId);
    Optional<JobApplication> findByUserIdAndVacancyId(Long userId, Long vacancyId);
    List<JobApplication> findByUserIdAndVacancyIdIn(Long userId, List<Long> vacancyIds);
    List<JobApplication> findByUserId(Long userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from JobApplication a where a.id = :id and a.user.id = :userId")
    Optional<JobApplication> findOwnedForUpdate(@Param("id") Long id, @Param("userId") Long userId);
}
