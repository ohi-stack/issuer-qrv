const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

// root
app.get("/", (req, res) => {
  res.send("QR-V Issuer Portal Running")
})

// verification endpoint
app.get("/verify/:id", (req, res) => {
  res.json({
    recordId: req.params.id,
    status: "verified",
    message: "QR-V verification successful"
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`QR-V server running on ${PORT}`)
})