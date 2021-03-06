module( "Popcorn Player" );

test( "Base player methods", 4, function() {

  ok( Popcorn.player, "Popcorn.player function exists" );

  ok( Popcorn.smart, "Popcorn.smart function exists" );

  Popcorn.player( "newplayer" );
  ok( Popcorn.newplayer, "Popcorn.player registers new players" );
  ok( Popcorn.player.registry[ "newplayer" ], "newplayers enter Popcorn.player.registry" );

});

asyncTest( "Base player functionality", function() {

  Popcorn.player( "baseplayer" );

  var p2 = Popcorn.baseplayer( "#video" ),
      expects = 12,
      count = 0,
      execCount = 0,
      // These make sure events are only fired once
      // any second call will produce a failed test
      forwardStart = false,
      forwardEnd = false,
      backwardStart = false,
      backwardEnd = false,
      wrapperRunning = {
        one: false,
        two: false
      };

  function plus() {
    if ( ++count === expects ) {
      // clean up added events after tests
      Popcorn.removePlugin( "forwards" );
      Popcorn.removePlugin( "backwards" );
      Popcorn.removePlugin( "wrapper" );
      p2.removePlugin( "exec" );
      start();
    }
  }

  Popcorn.plugin( "forwards", function() {
    return {
      start: function( event, options ) {

        if ( !options.startFired ) {

          options.startFired = true;
          forwardStart = !forwardStart;
          ok( forwardStart, "forward's start fired" );
          plus();
        }
      },
      end: function( event, options ) {

        if ( !options.endFired ) {

          options.endFired = true;
          forwardEnd = !forwardEnd;
          p2.currentTime( 1 ).play();
          ok( forwardEnd, "forward's end fired" );
          plus();
        }
      }
    };
  });

  p2.forwards({
    start: 3,
    end: 4
  });

  Popcorn.plugin( "backwards", function() {
    return {
      start: function( event, options ) {

        if ( !options.startFired ) {

          options.startFired = true;
          backwardStart = !backwardStart;
          p2.currentTime( 0 ).play();
          ok( true, "backward's start fired" );
          plus();
        }
      },
      end: function( event, options ) {

        if ( !options.endFired ) {

          options.endFired = true;
          backwardEnd = !backwardEnd;
          ok( backwardEnd, "backward's end fired" );
          plus();
          p2.currentTime( 5 ).play();
        }
      }
    };
  });

  p2.backwards({
    start: 1,
    end: 2
  });

  Popcorn.plugin( "wrapper", {
    start: function( event, options ) {

      wrapperRunning[ options.wrapper ] = true;
    },
    end: function( event, options ) {

      wrapperRunning[ options.wrapper ] = false;
    }
  });

  // second instance of wrapper is wrapping the first
  p2.wrapper({
    start: 6,
    end: 7,
    wrapper: "one"
  })
  .wrapper({
    start: 5,
    end: 8,
    wrapper: "two"
  })
  // checking wrapper 2's start
  .exec( 5, function() {

    if ( execCount === 0 ) {

      execCount++;
      ok( wrapperRunning.two, "wrapper two is running at second 5" );
      plus();
      ok( !wrapperRunning.one, "wrapper one is stopped at second 5" );
      plus();
    }
  })
  // checking wrapper 1's start
  .exec( 6, function() {

    if ( execCount === 1 ) {

      execCount++;
      ok( wrapperRunning.two, "wrapper two is running at second 6" );
      plus();
      ok( wrapperRunning.one, "wrapper one is running at second 6" );
      plus();
    }
  })
  // checking wrapper 1's end
  .exec( 7, function() {

    if ( execCount === 2 ) {

      execCount++;
      ok( wrapperRunning.two, "wrapper two is running at second 7" );
      plus();
      ok( !wrapperRunning.one, "wrapper one is stopped at second 7" );
      plus();
    }
  })
  // checking wrapper 2's end
  .exec( 8, function() {

    if ( execCount === 3 ) {

      execCount++;
      ok( !wrapperRunning.two, "wrapper two is stopped at second 9" );
      plus();
      ok( !wrapperRunning.one, "wrapper one is stopped at second 9" );
      plus();
    }
  });

  p2.currentTime( 3 ).play();
});

test( "player gets a proper _teardown", 1, function() {

  var teardownCalled = false;

  Popcorn.player( "teardownTester", {
    _teardown: function() {
      teardownCalled = true;
    }
  });

  var pop = Popcorn.teardownTester( "#video" );
  pop.destroy();

  equal( teardownCalled, true, "teardown function was called." );
});

asyncTest( "Popcorn.smart player selector", function() {

  var expects = 10,
      count = 0;

  function plus() {
    if ( ++count == expects ) {
      start();
    }
  }
  expect( expects );

  Popcorn.player( "spartaPlayer", {
    _canPlayType: function( nodeName, url ) {

      return url === "this is sparta" && nodeName !== "unsupported element";
    }
  });

  Popcorn.player( "neverEverLand" );

  // matching url to player returns true
  ok( Popcorn.spartaPlayer.canPlayType( "div", "this is sparta" ), "canPlayType method succeeds on valid url!" );
  plus();
  ok( Popcorn.spartaPlayer.canPlayType( "unsupported element", "this is sparta" ) === false, "canPlayType method fails on invalid container!" );
  plus();
  equal( Popcorn.smart( "#video", "this is sparta" ).media.nodeName, "DIV", "A player was found for this URL" );
  plus();

  // not matching url to player returns false
  ok( Popcorn.spartaPlayer.canPlayType( "div", "this is not sparta" ) === false, "canPlayType method fails on invalid url!" );
  plus();
  ok( Popcorn.spartaPlayer.canPlayType( "video", "this is not sparta" ) === false, "canPlayType method fails on invalid url and invalid container!" );
  plus();
  
  var thisIsNotSparta = Popcorn.smart( "#video", "this is not sparta", {
    events: {
      error: function( e ) {

        ok( true, "invalid player failed and called error callback" );
        plus();
      }
    }
  });
  
  equal( thisIsNotSparta.media.nodeName, "VIDEO", "no player was found for this URL, default to video element" );
  plus();

  // no existing canPlayType function returns undefined
  ok( Popcorn.neverEverLand.canPlayType( "guessing time!", "is this sparta?" ) === undefined, "non exist canPlayType returns undefined" );
  plus();

  var loaded = false,
      error = false;

  Popcorn.player( "somePlayer", {
    _canPlayType: function( nodeName, url ) {

      return url === "canPlayType";
    }
  });

  Popcorn.somePlayer( "#video", "canPlayType", {
    events: {
      canplaythrough: function( e ) {

        loaded = true;
      }
    }
  }).destroy();

  Popcorn.somePlayer( "#video", "cantPlayType", {
    events: {
      error: function( e ) {

        error = true;
      }
    }
  }).destroy();

  equal( loaded, true, "canPlayType passed on a valid type" );
  plus();
  equal( error, true, "canPlayType failed on an invalid type" );
  plus();

});
