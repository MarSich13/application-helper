package dev.applicationhelper.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name = "status_history")
public class StatusHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "application_id") private JobApplication application;
    @Enumerated(EnumType.STRING) private ApplicationStatus fromStatus;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private ApplicationStatus toStatus;
    @Column(nullable = false) private Instant changedAt;

    protected StatusHistory() {}
    public StatusHistory(JobApplication application, ApplicationStatus from, ApplicationStatus to, Instant at) {
        this.application = application; fromStatus = from; toStatus = to; changedAt = at;
    }
    public Long getId() { return id; }
    public ApplicationStatus getFromStatus() { return fromStatus; }
    public ApplicationStatus getToStatus() { return toStatus; }
    public Instant getChangedAt() { return changedAt; }
}
