module.exports = {
  run: function (stream, context) {
    stream.write('Running with the following data: \n')
    stream.end(JSON.stringify(context))
  }
}