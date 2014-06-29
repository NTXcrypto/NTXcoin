var NRS = (function(NRS, $, undefined) {
	$("#account_details_modal").on("show.bs.modal", function(e) {
		$("#account_details_modal_balance").show();

		if (NRS.accountInfo.errorCode) {
			$("#account_balance_table").hide();

			if (NRS.accountInfo.errorCode == 5) {
				$("#account_balance_warning").html("您的帐户是全新的，建议您存入一些NTX，您的帐户ID是：<strong>" + NRS.account + "</strong>").show();
			} else {
				$("#account_balance_warning").html(NRS.accountInfo.errorDescription.escapeHTML()).show();
			}
		} else {
			$("#account_balance_warning").hide();

			$("#account_balance_balance").html(NRS.formatAmount(new BigInteger(NRS.accountInfo.balanceNQT)) + " NTX");
			$("#account_balance_unconfirmed_balance").html(NRS.formatAmount(new BigInteger(NRS.accountInfo.unconfirmedBalanceNQT)) + " NTX");
			$("#account_balance_effective_balance").html(NRS.formatAmount(NRS.accountInfo.effectiveBalanceNXT) + " NTX");
			$("#account_balance_guaranteed_balance").html(NRS.formatAmount(new BigInteger(NRS.accountInfo.guaranteedBalanceNQT)) + " NTX");

			$("#account_balance_public_key").html(String(NRS.accountInfo.publicKey).escapeHTML());
			$("#account_balance_account_id").html(String(NRS.account).escapeHTML());
			$("#account_balance_account_rs").html(String(NRS.accountInfo.accountRS).escapeHTML());

			if (!NRS.accountInfo.publicKey) {
				$("#account_balance_public_key").html("/");
				$("#account_balance_warning").html("您的帐号没有公钥哦! 酱紫的话就不能像其它帐号一样受保护了. 您只要发送一笔款项，或者发送一条信息到其它帐户，或者购买一个别名就可以解决这问题了哦. (<a href='#' data-toggle='modal' data-target='#send_message_modal'>发送消息</a>, <a href='#' data-toggle='modal' data-target='#register_alias_modal'>购买别名</a>, <a href='#' data-toggle='modal' data-target='#send_money_modal'>发送NTX</a>, ...)").show();
			}
		}
	});

	$("#account_details_modal ul.nav li").click(function(e) {
		e.preventDefault();

		var tab = $(this).data("tab");

		$(this).siblings().removeClass("active");
		$(this).addClass("active");

		$(".account_details_modal_content").hide();

		var content = $("#account_details_modal_" + tab);

		content.show();
	});

	$("#account_details_modal").on("hidden.bs.modal", function(e) {
		$(this).find(".account_details_modal_content").hide();
		$(this).find("ul.nav li.active").removeClass("active");
		$("#account_details_balance_nav").addClass("active");
	});

	return NRS;
}(NRS || {}, jQuery));