export interface Resource {
    type: string;
    status: "RUNNING" | "STOPPED";
    lastActivity: number;
    desired?: number;
}