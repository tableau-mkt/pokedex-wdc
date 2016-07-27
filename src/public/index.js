(function($) {
  var typing = false,
      line = 0,
      speed = 80,
      lines = [["This is a web data connector for Tableau."],
        ["Want to start analyzing pokemon data?"],
        ["Click the big pokeball below."],
        ["Go ahead, and catch' em all!"]];
  
  $(document).ready(function() {
    // Initial text.
    type(lines[line] + "");
  });

  $(".box").click(function (e) {
    if (line < lines.length) {
      type(lines[line] + "");
    }
    else {
      $(".box").addClass("hide");
    }
  });

  $('.pokeball').click(function (e) {
    $('#submit').click();
  });

  // Type text in dialogue box.
  function type(text) {
    var timeout,
        char = 0,
        charType;

    if (!typing) {
      typing = true;
      line++;

      $(".box").text("");

      (function typeText() {
        timeout = setTimeout(function () {
          // Move on to the next char.
          char++;
          charType = text.substring(0, char);

          $(".box").html(charType.replace("\n", "<br />"));

          typeText();
          if (char == text.length) {
            clearTimeout(timeout)

            typing = false;
            if (line < lines.length) {
              $(".box").prepend("<i></i>");
            }
          }
        }, speed);
      })();
    }
  }
})(jQuery);
