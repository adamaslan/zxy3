import styles from "../styles/layout.module.css";
import { GoogleTagManager } from '@next/third-parties/google'

export default function Layout({ children }) {
  return <div className={styles.container}>{children}
    <GoogleTagManager gtmId="GTM-5S3CNFNS" />
  </div>;
}
