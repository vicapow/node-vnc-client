var Canvas = require('canvas')
var fs = require('fs')
var express = require('express')
var argv = require('optimist').argv
var app = express()
var rfb = require('rfb')({
  // host: '192.168.1.145'
  host: 'localhost'
  , port: 5900
  , shared: true
  , securityType: 'vnc'
  , password: argv['password'] || 'testtest'
})
rfb.on('error', function(e){ throw e })
rfb.dimensions = { width: 800, height: 600 }
app.use(express.static(__dirname + '/public'))
app.use(express.bodyParser())
app.get('/screen', function(req, res, next){
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0')
  // console.log('waiting for raw')
  rfb.once('raw', function(rect){
    // console.log('got rect')
    var canvas = new Canvas(rect.width, rect.height)
    var ctx = canvas.getContext('2d')
    var img = ctx.createImageData(canvas.width, canvas.height)
    var data = img.data
    var bytesPerPixel = rect.bitsPerPixel / 8
    var colorsPerPixel = 3
    var pixel = 0
    var h = 0,  w = 0, p = 0
    for(h = 0; h < canvas.height; h++){
      for(w = 0; w < canvas.width; w++){
        pixel = h * canvas.width * 4 + w * 4
        for(c = 0; c < colorsPerPixel; c++){
          data[pixel + c] = rect.fb.readUInt8(pixel + c)
        }
        data[pixel + 3] = 255 // alpha
      }
    }
    ctx.putImageData(img, 0, 0)
    canvas.jpegStream({
      bufSize: 4096
      , quality: 50
    }).pipe(res)
  })
  rfb.requestRedraw()
})

if(argv['give-control'] === 'true'){
  app.post('/mouse', function(req, res, next){
    // console.log(req.body)
    rfb.sendPointer(req.body.x, req.body.y, req.body.mask)
    res.send(200)
  })

  app.post('/keydown', function(req, res, next){
    // console.log('keydown', req.body.keyCode)
    rfb.sendKeyDown(req.body.keyCode)
    res.send(200)
  })

  app.post('/keyup', function(req, res, next){
    // console.log('keyup', req.body.keyCode)
    rfb.sendKeyUp(req.body.keyCode)
    res.send(200)
  })
}

app.listen(8080);
