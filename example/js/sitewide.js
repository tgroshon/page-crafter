$(function() {
  // Mobile-Menu click listener
  $('div.hamburger').off('click.mobile').on('click.mobile', function() {
    var $mobileMenu = $('div.mobile-menu');
    var $headerSpacer = $('div.header-spacer');

    if ($mobileMenu.data('toggle') === 0) {
      $mobileMenu.slideDown(500);
      $mobileMenu.data('toggle', 1);
    } else {
      $mobileMenu.slideUp(500);
      $mobileMenu.data('toggle', 0);
    }
  });
});
