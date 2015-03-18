module.exports = {
  ping: function(data) {
    console.log('Doing ping to: ', data['host'] );
    console.log('data:', data)
  },

  exit: function() {
    process.exit(0);
  }



}