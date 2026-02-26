import styles from "./ProgressBar.module.css";

interface Props {
  progress: number;
}

export function ProgressBar({ progress }: Props) {
  return (
    <div className={styles.track}>
      <div
        className={styles.fill}
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );
}
