import {GameIcon} from '../GameIcon';
import './ready-badge.css';
/** Readiness is supplied by the authoritative room snapshot. */
export function ReadyBadge(){return <span className="ready-badge"><GameIcon kind="check"/>已准备</span>;}
