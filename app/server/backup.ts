import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";

const DATA_FILE = "data/data.json";
const BACKUP_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours

export class SimpleBackupManager {
  constructor() {
    this.ensureDataDir();
    this.startBackupTimer();
    // Do initial backup check
    this.checkAndBackup();
  }

  private ensureDataDir(): void {
    if (!existsSync("data")) {
      mkdirSync("data", { recursive: true });
    }
  }

  private startBackupTimer(): void {
    setInterval(() => {
      this.checkAndBackup();
    }, BACKUP_INTERVAL);
  }

  private checkAndBackup(): void {
    if (!existsSync(DATA_FILE)) {
      console.log("No data.json to backup yet");
      return;
    }

    try {
      const currentData = readFileSync(DATA_FILE, "utf-8");
      const currentTime = new Date();
      const backupFileName = `data-backup-${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, "0")}-${String(currentTime.getDate()).padStart(2, "0")}-${String(currentTime.getHours()).padStart(2, "0")}-${String(currentTime.getMinutes()).padStart(2, "0")}.json`;
      const backupPath = join("data", backupFileName);

      const lastBackup = this.getLastBackupFile();

      if (lastBackup) {
        const lastBackupPath = join("data", lastBackup);
        const lastBackupData = readFileSync(lastBackupPath, "utf-8");

        if (currentData === lastBackupData) {
          unlinkSync(lastBackupPath);
          console.log(`Removed unchanged backup: ${lastBackup}`);
        }
      }

      writeFileSync(backupPath, currentData);
      console.log(`Backup created: ${backupFileName}`);
    } catch (error) {
      console.error("Backup failed:", error);
    }
  }

  private getLastBackupFile(): string | null {
    try {
      const files = readdirSync("data")
        .filter(
          (file) => file.startsWith("data-backup-") && file.endsWith(".json"),
        )
        .sort();

      return files.length > 0 ? files[files.length - 1] : null;
    } catch {
      return null;
    }
  }

  getBackupInfo() {
    try {
      const files = readdirSync("data")
        .filter(
          (file) => file.startsWith("data-backup-") && file.endsWith(".json"),
        )
        .sort();

      return {
        totalBackups: files.length,
        oldestBackup: files[0] || null,
        newestBackup: files[files.length - 1] || null,
      };
    } catch {
      return { totalBackups: 0, oldestBackup: null, newestBackup: null };
    }
  }
}
