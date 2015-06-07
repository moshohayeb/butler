module.exports = {
  colors: true,
  appendDefault: true,
  prompt: '<COMPANY-CLI> ',
  motd:   function (write) {
    write('Last login: Wed Mar 19 12:33:05 2014 from 10.10.12.20'.green)
  }
}