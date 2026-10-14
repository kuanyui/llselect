// LAN URLs for `npm run serve:site`, which passes the port as the only
// argument. The server listens on every printed address: python's
// http.server binds all interfaces when given no --bind.
import { networkInterfaces } from 'node:os'

function lanUrlLines(port) {
  let interfaces
  try {
    interfaces = networkInterfaces()
  } catch (error) {
    // Some sandboxes forbid the interface lookup; the server must start anyway.
    return [`LAN: cannot list this machine's addresses: ${error.message}`]
  }
  const lines = []
  for (const [interfaceName, addressInfos] of Object.entries(interfaces)) {
    for (const addressInfo of addressInfos) {
      // Node 18.0 - 18.3 report the family as the number 4.
      const isIPv4 = addressInfo.family === 'IPv4' || addressInfo.family === 4
      if (isIPv4 && !addressInfo.internal) {
        // The interface name helps pick the URL a LAN device can reach:
        // Docker bridges and VPNs add addresses of their own.
        lines.push(`LAN: http://${addressInfo.address}:${port}/ (${interfaceName})`)
      }
    }
  }
  if (lines.length === 0) {
    lines.push('LAN: no IPv4 address besides loopback')
  }
  return lines
}

for (const line of lanUrlLines(process.argv[2])) {
  console.log(line)
}
