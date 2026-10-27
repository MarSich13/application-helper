package dev.applicationhelper.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "applications")
public class JobApplication {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id") private AppUser user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "vacancy_id") private Vacancy vacancy;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ApplicationStatus status;
    @Column(nullable = false, columnDefinition = "text") private String notes = "";
    @Version private long version;
    @Column(nullable = false) private Instant createdAt;
    @Column(nullable = false) private Instant statusChangedAt;
    private Instant appliedAt;

    public Long getId() { return id; }
    public AppUser getUser() { return user; }
    public void setUser(AppUser value) { user = value; }
    public Vacancy getVacancy() { return vacancy; }
    public void setVacancy(Vacancy value) { vacancy = value; }
    public ApplicationStatus getStatus() { return status; }
    public void setStatus(ApplicationStatus value) { status = value; }
    public String getNotes() { return notes; }
    public void setNotes(String value) { notes = value; }
    public long getVersion() { return version; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant value) { createdAt = value; }
    public Instant getStatusChangedAt() { return statusChangedAt; }
    public void setStatusChangedAt(Instant value) { statusChangedAt = value; }
    public Instant getAppliedAt() { return appliedAt; }
    public void setAppliedAt(Instant value) { appliedAt = value; }
}
