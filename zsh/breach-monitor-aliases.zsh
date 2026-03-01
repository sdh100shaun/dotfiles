# breach-monitor — shortcuts for the email breach monitoring tool
# Source: dotfiles/breach-monitor/
# Requires Node.js and a HaveIBeenPwned API key (https://haveibeenpwned.com/API/Key)

BREACH_MONITOR_DIR="${0:A:h}/../breach-monitor"

# Run the breach monitor CLI
alias breach-monitor="npx --prefix $BREACH_MONITOR_DIR tsx $BREACH_MONITOR_DIR/src/index.ts"

# Convenience shortcuts for the most common commands
alias breach-setup="breach-monitor setup"
alias breach-check="breach-monitor check"
alias breach-list="breach-monitor list"
