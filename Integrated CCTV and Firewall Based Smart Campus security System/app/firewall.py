import os

class FirewallManager:
    def __init__(self):
        pass

    def block_ip(self, ip_address):
        # This is a placeholder for the actual firewall command.
        # On a Linux system, this might look like:
        # os.system(f"iptables -A INPUT -s {ip_address} -j DROP")
        print(f"Blocking IP address: {ip_address}")

    def unblock_ip(self, ip_address):
        # This is a placeholder for the actual firewall command.
        # On a Linux system, this might look like:
        # os.system(f"iptables -D INPUT -s {ip_address} -j DROP")
        print(f"Unblocking IP address: {ip_address}")
