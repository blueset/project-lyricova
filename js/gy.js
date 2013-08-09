/* Index Styling */
function mansonry() {
	$('.container .songbox-row').masonry({
    	// options
    	itemSelector : '.songbox-cont',
    	columnWidth :  function(containerWidth){
		   	var columnW=$('.songbox-cont').width();
			if($(window).width()>=768){columnW=containerWidth/2;}
			if($(window).width()>=980){columnW=10;}
			if($(window).width()>=1200){columnW=10;}
    		return columnW;
  		}
	});
}

$('.collapse').on('shown',function () {	
	$('.container .songbox-row').masonry('reload');
});
$('.collapse').on('hidden',function () {	
	$('.container .songbox-row').masonry('reload');
});
//Tooltip
if ($("[data-toggle=tooltip]").length) {
     $("[data-toggle=tooltip]").tooltip();
     }
//popover
if ($("[data-toggle=popover]").length) {
     $("[data-toggle=popover]").popover();
     }
$(window).resize(function(){
  //mansonry();
  if($(window).width()<=979){
		$(".songbox-cont").addClass("span6");
		$(".songbox-cont").removeClass("span4");
	}else{
		$(".songbox-cont").addClass("span4");
		$(".songbox-cont").removeClass("span6");
	}
});



function delConfModal(id,lyric){
		$("#btn-delete").attr('href',currpath+'delete/'+id);
		$("#del_info").html("Item: <br>"+lyric+" <br> with ID = "+id);
		$('.modal').modal('show').on('shown',function(){});
	}
function delConfModalSingle(){
		$('.modal').modal('show').on('shown',function(){});
	}
function delImgModal(page,id,lyric){
		$("#btn-delete").attr('href',currpath+'admin/image/'+page+'/delete/'+id);
		$("#del_info").html("Item: <br>"+lyric+" <br> with ID = "+id);
		$('.modal').modal('show').on('shown',function(){});
	}
function delUserModal(id,lyric){
		$("#btn-delete").attr('href',currpath+'admin/user_delete/'+id);
		$("#del_info").html("User: <br>"+lyric+" <br> with ID = "+id);
		$('.modal').modal('show').on('shown',function(){});
	}

$(function(){
	mansonry();
  if($(window).width()<=979){
		$(".songbox-cont").addClass("span6");
		$(".songbox-cont").removeClass("span4");
	}else{
		$(".songbox-cont").addClass("span4");
		$(".songbox-cont").removeClass("span6");
	}
});



/* IMGGEN_get post info */
function loadpost()
{
//.... AJAX script goes here ...
	postid = $('#postid').val();
  	$.get(currpath+"/imggen/getpostxml/"+postid+".xml",function (data,text) {
  		
  		$("#meta").val($(data).find("metainfo").text());
  		$("#lyric").text($(data).find("lyric").text());
  	});
}
$("#postid").keypress(function(evt){
    if(evt.keyCode==13){
    	loadpost();
    	return 0;
    }
  });
