const express = require("express")
const cors = require("cors")
const QRCode = require("qrcode")
const { v4: uuidv4 } = require("uuid")

const app = express()

app.use(cors())
app.use(express.json())

// in-memory record store (temporary until database is added)
const records = {}

// root
app.get("/", (req, res) => {
  res.send("QR-V Issuer Portal Running")
})

/*
CREATE RECORD
*/
app.post("/records", async (req, res) => {

  const id = uuidv4()

  const record = {
    id,
    title: req.body.title || "Untitled Record",
    subject: req.body.subject || "Unknown",
    issuer: req.body.issuer || "Unknown",
    status: "active",
    createdAt: new Date().toISOString()
  }

  records[id] = record

  const verifyUrl = `https://issuer.qrv.network/verify/${id}`

  const qrCode = await QRCode.toDataURL(verifyUrl)

  res.json({
    record,
    verifyUrl,
    qrCode
  })
})

/*
GET RECORD
*/
app.get("/records/:id", (req, res) => {

  const record = records[req.params.id]

  if (!record) {
    return res.status(404).json({
      error: "Record not found"
    })
  }

  res.json(record)
})

/*
VERIFY RECORD
*/
app.get("/verify/:id", (req, res) => {

  const record = records[req.params.id]

  if (!record) {
    return res.status(404).json({
      status: "invalid",
      message: "Record not found"
    })
  }

  res.json({
    recordId: record.id,
    status: record.status,
    title: record.title,
    subject: record.subject,
    issuer: record.issuer
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`QR-V server running on ${PORT}`)
})
