import http from 'http'
import https from 'https'

http.globalAgent = new http.Agent({ keepAlive: false })
https.globalAgent = new https.Agent({ keepAlive: false })
