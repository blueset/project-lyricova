
function mansory() {
		 $('.container .row').masonry({
    // options
    itemSelector : '.songbox-cont',
    columnWidth :  function( containerWidth ) {
    	var columnW=$('.songbox-cont').width();
	if($(window).width()>=768){columnW=containerWidth/2;}
	if($(window).width()>=980){columnW=10;}
	if($(window).width()>=1200){columnW=10;}
    return columnW;
  	}
	}
}

$(window).resize(function(){
  mansory();
  if($(window).width()<=979){
		$(".songbox-cont").addClass("span6");
		$(".songbox-cont").removeClass("span4");
	}else{
		$(".songbox-cont").addClass("span4");
		$(".songbox-cont").removeClass("span6");
	}
});

function delConfModal(id,lyric){
		$("#btn-delete").attr('href','delete/'+id);
		$("#del_info").html("Item: <br>"+lyric+" <br> with ID = "+id);
		$('.modal').modal('show').on('shown',function(){})
	}

$(function(){
	mansory();
  });
  if($(window).width()<=979){
		$(".songbox-cont").addClass("span6");
		$(".songbox-cont").removeClass("span4");
	}else{
		$(".songbox-cont").addClass("span4");
		$(".songbox-cont").removeClass("span6");
	}
});