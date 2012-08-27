/**
 * jquery is required
 */
    // 일정 시간 이내의 호출은 캔슬하고 처음 호출만 살림
    // _.defer 호환
    var deferTime;
    var defer = function(callback, timeout){
      if (deferTime === undefined){
        setTimeout(callback, timeout);
        setTimeout(function(){
          deferTime = undefined;
        }, timeout);
        deferTime = Math.round((new Date()).getTime() / 1000);
        return;
      }
      var now = Math.round((new Date()).getTime() / 1000);
      var timeoutId = setTimeout(callback, timeout);
      if ( now < deferTime + timeout ){
        clearTimeout(timeoutId);
      }
    };

    // 일정 시간 이내의 call은 캔슬하고 마지막 콜만 남김
    // _.debounce 호환
    var debounceTime, lastCall;
    var debounce = function(callback, waitTime){
      var now = Math.round((new Date()).getTime() / 1000);
      if (debounceTime === undefined){
        lastCall = setTimeout(callback, waitTime);
        debounceTime = now;
        return;
      }
      if ( now < debounceTime + waitTime ){
        debounceTime = now;
        clearTimeout(lastCall);
        lastCall = setTimeout(function(){
          callback();
          debounceTime = undefined;
        }, waitTime);
      }
    };
