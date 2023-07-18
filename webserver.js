const express = require("express")

const httpServer = express()
httpServer.use(express.static('./example/public'))
httpServer.listen(81)