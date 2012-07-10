jQuery(function($){
	// Search
	var $search = $('.nHead>.search');
	var $feedback = $('.feedback');
	var $lnb = $('.lnb');
	$('.nHead>.account>.btn-group>.tog').click(function(){
		$(this).parents('.account').eq(0).next('.search').toggleClass('open');
		if($search.hasClass('open')){
			$search.next($feedback).hide();
			$lnb.hide();
		} else {
			$search.next($feedback).show();
			$lnb.show();
		}
	});
	$(window).resize(function(){
		var $ww = $(window).width();
		if($ww >= 700){
			$search.removeClass('open').next($feedback).show();
			$lnb.show();
		}
	}).resize();
	// Write 
	var $write = $('.nBody>.write');
	var $btnWrite = $write.find('.btnWrite');
	var $btnPreview = $write.find('.btnPreview');
	$btnWrite.click(function(){
		$btnPreview.removeClass('active');
		$btnWrite.addClass('active');
		$write.removeClass('po ip').addClass('io');
	});
	$btnPreview.click(function(){
		$btnWrite.removeClass('active');
		$btnPreview.addClass('active');
		$write.removeClass('io ip').addClass('po');
	});
	$write.find('.ic>.tog').click(function(){
		if($write.hasClass('io')){
			$write.removeClass('io').addClass('ip');
		} else {
			$btnWrite.click();
		}
	});
	var $mdSyntax = $('.mdSyntax');
	$write.find('.mdHelp').click(function(){
		$(this).next($mdSyntax).toggle();
	});
	$write.find('.mdSyntax>.close').click(function(){
		$(this).parent($mdSyntax).hide();
	});
	$(document).click(function(){
		$write.find($mdSyntax).hide();
	});
	$write.find('.md').click(function(e){
		e.stopPropagation();
	});
	$write.find('.files .close')
		.focus(function(){
			$(this).parent('.e').css('opacity','1').prev('.i').find('.label').css('opacity','1');
		})
		.focusout(function(){
			$(this).parent('.e').css('opacity','0').prev('.i').find('.label').css('opacity','0');
		});
	// Local Navigation Toggle
	$('.lnb>.tog').click(function(){
		$(this).prev('.tob').slideToggle(200);
	});
	// Task
	$('.task .table>thead>tr:first>th:first>input:checkbox').change(function(){
		var $checkbox = $(this).parents('.table:first').find('tbody>tr>td:first-child>input:checkbox');
		if($(this).is(':checked')){
			$checkbox.attr('checked','checked');
		} else {
			$checkbox.removeAttr('checked');
		}
	});
});