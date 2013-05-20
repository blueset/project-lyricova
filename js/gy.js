//$(document).ready(function(){

$(window).resize(function(){
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
//});