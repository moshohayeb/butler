Array.prototype.compare = function (subject) {
  if (this.length != subject.length) return false;
  for (var i = 0; i < subject.length; i++) {
    if (this[i].compare) {
      if (!this[i].compare(subject[i])) return false;
    }
    if (this[i] !== subject[i]) return false;
  }
  return true;
}