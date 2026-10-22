/* Redimensionnement. Sur téléphone, la barre d'adresse qui apparaît ou disparaît pendant le défilement
   déclenche un « resize » à chaque fois : on n'y réagit que si la largeur a vraiment changé (rotation),
   sinon tout ce qui se reconstruit clignoterait en plein défilement. Sur ordinateur, rien ne change. */

export function onResize(fn, mobile) {
  let w = window.innerWidth;
  window.addEventListener('resize', () => {
    if (mobile) {
      if (window.innerWidth === w) return;
      w = window.innerWidth;
    }
    fn();
  });
}
