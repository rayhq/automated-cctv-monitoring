import os
import logging
from datetime import datetime
from typing import List, Dict, Optional
from collections import defaultdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FirewallManager:
    """
    Advanced firewall manager with AI threat detection integration.
    Automatically blocks threats detected by AI and maintains IP whitelist/blacklist.
    """
    
    def __init__(self):
        """Initialize the firewall manager."""
        self.blocked_ips = set()
        self.whitelist_ips = set()
        self.threat_logs = []
        self.suspicious_activities = defaultdict(list)
        self.threat_threshold = 3  # Number of suspicious activities before blocking
        
        # Default whitelist (add as needed)
        self.whitelist_ips.add('127.0.0.1')
        self.whitelist_ips.add('localhost')
    
    def block_ip(self, ip_address: str, reason: str = "Manual block", duration: int = None):
        """
        Block an IP address.
        
        Args:
            ip_address: IP address to block
            reason: Reason for blocking
            duration: Block duration in seconds (None = permanent)
        """
        if ip_address in self.whitelist_ips:
            logger.warning(f"Cannot block whitelisted IP: {ip_address}")
            return False
        
        self.blocked_ips.add(ip_address)
        
        # Log the action
        threat_log = {
            'action': 'BLOCK',
            'ip': ip_address,
            'reason': reason,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        }
        self.threat_logs.append(threat_log)
        
        logger.info(f"Blocked IP address: {ip_address} - Reason: {reason}")
        print(f"🛡️  FIREWALL: Blocked IP {ip_address} - {reason}")
        
        # This is a placeholder for actual firewall commands
        # On Linux: os.system(f"iptables -A INPUT -s {ip_address} -j DROP")
        # On Windows: os.system(f"netsh advfirewall firewall add rule name='Block {ip_address}' dir=in action=block remoteip={ip_address}")
        
        return True
    
    def unblock_ip(self, ip_address: str, reason: str = "Manual unblock"):
        """
        Unblock an IP address.
        
        Args:
            ip_address: IP address to unblock
            reason: Reason for unblocking
        """
        if ip_address in self.blocked_ips:
            self.blocked_ips.remove(ip_address)
            
            threat_log = {
                'action': 'UNBLOCK',
                'ip': ip_address,
                'reason': reason,
                'timestamp': datetime.now().isoformat()
            }
            self.threat_logs.append(threat_log)
            
            logger.info(f"Unblocked IP address: {ip_address}")
            print(f"✓ FIREWALL: Unblocked IP {ip_address}")
            
            # This is a placeholder for actual firewall commands
            # On Linux: os.system(f"iptables -D INPUT -s {ip_address} -j DROP")
            # On Windows: os.system(f"netsh advfirewall firewall delete rule name='Block {ip_address}'")
            
            return True
        
        return False
    
    def add_to_whitelist(self, ip_address: str):
        """Add IP address to whitelist."""
        self.whitelist_ips.add(ip_address)
        logger.info(f"Added {ip_address} to whitelist")
        return True
    
    def remove_from_whitelist(self, ip_address: str):
        """Remove IP address from whitelist."""
        if ip_address in self.whitelist_ips:
            self.whitelist_ips.remove(ip_address)
            logger.info(f"Removed {ip_address} from whitelist")
            return True
        return False
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if an IP address is blocked."""
        return ip_address in self.blocked_ips
    
    def is_ip_whitelisted(self, ip_address: str) -> bool:
        """Check if an IP address is whitelisted."""
        return ip_address in self.whitelist_ips
    
    def report_suspicious_activity(self, ip_address: str, activity_type: str,
                                  details: Optional[Dict] = None):
        """
        Report suspicious activity from an IP.
        Automatically blocks IP if threshold is exceeded.
        
        Args:
            ip_address: Source IP of suspicious activity
            activity_type: Type of suspicious activity
            details: Additional activity details
        """
        if ip_address in self.whitelist_ips:
            return
        
        activity = {
            'type': activity_type,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }
        
        self.suspicious_activities[ip_address].append(activity)
        
        logger.warning(f"Suspicious activity from {ip_address}: {activity_type}")
        
        # Check if threshold exceeded
        if len(self.suspicious_activities[ip_address]) >= self.threat_threshold:
            self.block_ip(ip_address, 
                         f"Automatic block: {activity_type} (threshold exceeded)")
    
    def report_ai_threat(self, threat_type: str, threat_description: str,
                        source_ip: Optional[str] = None, location: Optional[str] = None,
                        confidence: float = 0.85):
        """
        Report AI-detected threat and take action.
        
        Args:
            threat_type: Type of threat (INTRUDER, UNAUTHORIZED_DEVICE, SUSPICIOUS_BEHAVIOR, etc.)
            threat_description: Description of the threat
            source_ip: Source IP if applicable
            location: Location of threat (camera location)
            confidence: Confidence level of detection (0-1)
        """
        threat_log = {
            'action': 'AI_THREAT_DETECTED',
            'type': threat_type,
            'description': threat_description,
            'source_ip': source_ip,
            'location': location,
            'confidence': confidence,
            'timestamp': datetime.now().isoformat()
        }
        self.threat_logs.append(threat_log)
        
        logger.critical(f"AI THREAT DETECTED: {threat_type} - {threat_description}")
        print(f"🚨 FIREWALL: AI THREAT - {threat_type} at {location} (confidence: {confidence:.2%})")
        
        # Block source IP if provided and threat is severe
        if source_ip and confidence > 0.7:
            self.report_suspicious_activity(
                source_ip,
                threat_type,
                {
                    'description': threat_description,
                    'confidence': confidence,
                    'location': location
                }
            )
    
    def report_network_anomaly(self, anomaly_type: str, details: Optional[Dict] = None):
        """
        Report network anomaly detected.
        
        Args:
            anomaly_type: Type of anomaly
            details: Anomaly details
        """
        threat_log = {
            'action': 'NETWORK_ANOMALY',
            'type': anomaly_type,
            'details': details or {},
            'timestamp': datetime.now().isoformat()
        }
        self.threat_logs.append(threat_log)
        
        logger.warning(f"Network anomaly detected: {anomaly_type}")
        print(f"⚠️  FIREWALL: Network anomaly - {anomaly_type}")
    
    def get_blocked_ips(self) -> List[str]:
        """Get list of blocked IP addresses."""
        return list(self.blocked_ips)
    
    def get_whitelist(self) -> List[str]:
        """Get list of whitelisted IP addresses."""
        return list(self.whitelist_ips)
    
    def get_threat_logs(self, limit: int = 100) -> List[Dict]:
        """Get threat logs."""
        return self.threat_logs[-limit:]
    
    def get_suspicious_activities(self, ip_address: Optional[str] = None) -> Dict:
        """Get suspicious activities for an IP or all."""
        if ip_address:
            return {ip_address: self.suspicious_activities.get(ip_address, [])}
        return dict(self.suspicious_activities)
    
    def get_firewall_status(self) -> Dict:
        """Get firewall status summary."""
        return {
            'blocked_ips_count': len(self.blocked_ips),
            'whitelisted_ips_count': len(self.whitelist_ips),
            'total_threats_logged': len(self.threat_logs),
            'active_ips_with_suspicious_activity': len(self.suspicious_activities),
            'blocked_ips': list(self.blocked_ips),
            'recent_threats': self.threat_logs[-10:] if self.threat_logs else []
        }
    
    def reset_ip_suspicion(self, ip_address: str):
        """Reset suspicion counter for an IP address."""
        if ip_address in self.suspicious_activities:
            del self.suspicious_activities[ip_address]
            logger.info(f"Reset suspicion for {ip_address}")
            return True
        return False
    
    def clear_old_logs(self, days: int = 7):
        """Clear logs older than specified days."""
        from datetime import timedelta, datetime as dt
        cutoff_date = (dt.now() - timedelta(days=days)).isoformat()
        
        original_count = len(self.threat_logs)
        self.threat_logs = [log for log in self.threat_logs 
                          if log.get('timestamp', '') >= cutoff_date]
        
        logger.info(f"Cleared {original_count - len(self.threat_logs)} old logs")
        return original_count - len(self.threat_logs)
