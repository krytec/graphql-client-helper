import { LoggingService } from "../services/LoggingService";
import { window } from "vscode";

export function showLogingWindowCommand(logger: LoggingService) {
    logger.showLog();
}