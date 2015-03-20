module.exports = {
  ping: function (data) { console.log('pinging:', data) },

  exit: function () {
    console.log('Exiting..');
    process.exit(0);
  },

  reboot: function () { console.log('Rebooting'); },

  clear: {
    arp:      function () { console.log('Clearing arp table'); },
    terminal: function () { console.log('Clearing terminal'); }
  },

  show: {
    arp:           function () { console.log('Showing arp'); },
    configuration: function () { console.log('Showing configuration'); },
    date:          function () { console.log('Showing date'); },
    interface:     function (ctx) {
      console.log('Showing interface %s (%s)', ctx['name'], ctx['brief']);
    },
    ntp:           function () { console.log('Showing ntp'); },
    uptime:        function () { console.log('Showing uptime'); },
    version:       function () { console.log('Showing version'); }
  }
}