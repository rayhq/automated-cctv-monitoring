import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Dict, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AlertGenerator:
    """
    AlertGenerator class for handling security alerts in the campus security system.
    Supports multiple alert channels: console, logging, email, and database.
    """
    
    ALERT_LEVELS = {
        'LOW': 1,
        'MEDIUM': 2,
        'HIGH': 3,
        'CRITICAL': 4
    }
    
    def __init__(self, email_config: Optional[Dict] = None):
        """
        Initialize the AlertGenerator.
        
        Args:
            email_config: Dictionary with email configuration (smtp_server, smtp_port, sender_email, sender_password)
        """
        self.email_config = email_config or {}
        self.alerts_history: List[Dict] = []
        self.alert_recipients: List[str] = []
    
    def send_alert(self, message: str, level: str = 'MEDIUM', alert_type: str = 'GENERAL',
                   recipient_emails: Optional[List[str]] = None, details: Optional[Dict] = None):
        """
        Send an alert through multiple channels.
        
        Args:
            message: The alert message
            level: Alert level (LOW, MEDIUM, HIGH, CRITICAL)
            alert_type: Type of alert (SECURITY_THREAT, UNAUTHORIZED_ACCESS, NETWORK_ANOMALY, HARDWARE_FAILURE, etc.)
            recipient_emails: List of email addresses to send the alert to
            details: Additional details about the alert
        """
        alert_data = {
            'timestamp': datetime.now().isoformat(),
            'message': message,
            'level': level,
            'type': alert_type,
            'details': details or {}
        }
        
        # Store alert in history
        self.alerts_history.append(alert_data)
        
        # Console/Logging output
        self._log_alert(alert_data)
        
        # Send email if configured and recipients provided
        if self.email_config and (recipient_emails or self.alert_recipients):
            self._send_email_alert(alert_data, recipient_emails or self.alert_recipients)
        
        # You can add database storage here
        # self._store_alert_to_db(alert_data)
    
    def send_threat_alert(self, threat_description: str, severity: str = 'HIGH',
                         threat_details: Optional[Dict] = None):
        """
        Send a security threat alert.
        
        Args:
            threat_description: Description of the security threat
            severity: Severity level (LOW, MEDIUM, HIGH, CRITICAL)
            threat_details: Additional threat details (location, time, etc.)
        """
        self.send_alert(
            message=f"SECURITY THREAT DETECTED: {threat_description}",
            level=severity,
            alert_type='SECURITY_THREAT',
            details=threat_details
        )
    
    def send_unauthorized_access_alert(self, access_type: str, source: str,
                                      access_details: Optional[Dict] = None):
        """
        Send an unauthorized access alert.
        
        Args:
            access_type: Type of unauthorized access (e.g., 'ZONE_BREACH', 'IP_BLOCK_ATTEMPT')
            source: Source of the unauthorized access (IP address, user, etc.)
            access_details: Additional access details
        """
        message = f"UNAUTHORIZED ACCESS ATTEMPT: {access_type} from {source}"
        self.send_alert(
            message=message,
            level='CRITICAL',
            alert_type='UNAUTHORIZED_ACCESS',
            details=access_details or {'source': source, 'type': access_type}
        )
    
    def send_network_anomaly_alert(self, anomaly_description: str,
                                  network_details: Optional[Dict] = None):
        """
        Send a network anomaly alert.
        
        Args:
            anomaly_description: Description of the network anomaly
            network_details: Network-related details (IP addresses, ports, etc.)
        """
        self.send_alert(
            message=f"NETWORK ANOMALY DETECTED: {anomaly_description}",
            level='HIGH',
            alert_type='NETWORK_ANOMALY',
            details=network_details
        )
    
    def send_hardware_failure_alert(self, hardware_type: str, failure_details: Optional[Dict] = None):
        """
        Send a hardware failure alert.
        
        Args:
            hardware_type: Type of hardware that failed (CAMERA, FIREWALL, SERVER, etc.)
            failure_details: Details about the failure
        """
        message = f"HARDWARE FAILURE: {hardware_type} has failed or is not responding"
        self.send_alert(
            message=message,
            level='MEDIUM',
            alert_type='HARDWARE_FAILURE',
            details=failure_details or {'hardware_type': hardware_type}
        )
    
    def add_alert_recipient(self, email: str):
        """Add an email address to the alert recipients list."""
        if email not in self.alert_recipients:
            self.alert_recipients.append(email)
    
    def remove_alert_recipient(self, email: str):
        """Remove an email address from the alert recipients list."""
        if email in self.alert_recipients:
            self.alert_recipients.remove(email)
    
    def _log_alert(self, alert_data: Dict):
        """Log alert to console and logging system."""
        timestamp = alert_data['timestamp']
        level = alert_data['level']
        message = alert_data['message']
        alert_type = alert_data['type']
        
        log_message = f"[{timestamp}] [{level}] [{alert_type}] {message}"
        
        if level == 'CRITICAL':
            logger.critical(log_message)
        elif level == 'HIGH':
            logger.error(log_message)
        elif level == 'MEDIUM':
            logger.warning(log_message)
        else:
            logger.info(log_message)
        
        print(f"⚠️  ALERT: {log_message}")
    
    def _send_email_alert(self, alert_data: Dict, recipients: List[str]):
        """
        Send alert via email.
        
        Args:
            alert_data: Alert data dictionary
            recipients: List of recipient email addresses
        """
        if not self.email_config.get('smtp_server'):
            logger.warning("Email configuration not provided. Skipping email alert.")
            return
        
        try:
            # Compose email
            subject = f"[{alert_data['level']}] Security Alert: {alert_data['type']}"
            body = self._format_email_body(alert_data)
            
            # Create email message
            msg = MIMEMultipart()
            msg['From'] = self.email_config.get('sender_email')
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            with smtplib.SMTP(self.email_config.get('smtp_server'),
                            self.email_config.get('smtp_port', 587)) as server:
                server.starttls()
                server.login(self.email_config.get('sender_email'),
                           self.email_config.get('sender_password'))
                server.send_message(msg)
            
            logger.info(f"Email alert sent to {recipients}")
        
        except Exception as e:
            logger.error(f"Failed to send email alert: {str(e)}")
    
    def _format_email_body(self, alert_data: Dict) -> str:
        """Format alert data into email body."""
        body = f"""
Security Alert Notification
{'='*50}

Alert Type: {alert_data['type']}
Severity Level: {alert_data['level']}
Timestamp: {alert_data['timestamp']}

Message:
{alert_data['message']}

Additional Details:
{self._format_details(alert_data.get('details', {}))}

{'='*50}
Smart Campus Security System
"""
        return body
    
    def _format_details(self, details: Dict) -> str:
        """Format details dictionary into readable text."""
        if not details:
            return "No additional details"
        
        formatted = []
        for key, value in details.items():
            formatted.append(f"  {key}: {value}")
        return '\n'.join(formatted)
    
    def get_alerts_by_level(self, level: str) -> List[Dict]:
        """Get all alerts of a specific level."""
        return [alert for alert in self.alerts_history if alert['level'] == level]
    
    def get_alerts_by_type(self, alert_type: str) -> List[Dict]:
        """Get all alerts of a specific type."""
        return [alert for alert in self.alerts_history if alert['type'] == alert_type]
    
    def get_recent_alerts(self, limit: int = 10) -> List[Dict]:
        """Get the most recent alerts."""
        return self.alerts_history[-limit:]
    
    def clear_alert_history(self):
        """Clear all stored alerts."""
        self.alerts_history.clear()
        logger.info("Alert history cleared")
    
    def get_alert_summary(self) -> Dict:
        """Get a summary of all alerts."""
        summary = {
            'total_alerts': len(self.alerts_history),
            'by_level': {},
            'by_type': {}
        }
        
        for level in self.ALERT_LEVELS.keys():
            summary['by_level'][level] = len(self.get_alerts_by_level(level))
        
        for alert in self.alerts_history:
            alert_type = alert['type']
            summary['by_type'][alert_type] = summary['by_type'].get(alert_type, 0) + 1
        
        return summary
