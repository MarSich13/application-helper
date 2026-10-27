package dev.applicationhelper.model;

import java.util.Set;

public enum ApplicationStatus {
    SAVED, APPLIED, INTERVIEW, OFFER, ACCEPTED, REJECTED, WITHDRAWN;

    public Set<ApplicationStatus> nextStatuses() {
        return switch (this) {
            case SAVED -> Set.of(APPLIED, WITHDRAWN);
            case APPLIED -> Set.of(INTERVIEW, REJECTED, WITHDRAWN);
            case INTERVIEW -> Set.of(OFFER, REJECTED, WITHDRAWN);
            case OFFER -> Set.of(ACCEPTED, REJECTED, WITHDRAWN);
            case ACCEPTED, REJECTED, WITHDRAWN -> Set.of(SAVED);
        };
    }
}
