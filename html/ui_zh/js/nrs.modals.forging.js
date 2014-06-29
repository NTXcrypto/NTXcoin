var NRS = (function(NRS, $, undefined) {
	NRS.forms.errorMessages.startForging = {
		"5": "您无法锻造，主要是您余额是0，而且帐号太新了(至少要超过一天的时间)."
	};

	NRS.forms.startForgingComplete = function(response, data) {
		if ("deadline" in response) {
			$("#forging_indicator").addClass("forging");
			$("#forging_indicator span").html("Forging");
			NRS.isForging = true;
			$.growl("Forging started successfully.", {
				type: "success"
			});
		} else {
			NRS.isForging = false;
			$.growl("Couldn't start forging, unknown error.", {
				type: 'danger'
			});
		}
	}

	NRS.forms.stopForgingComplete = function(response, data) {
		if ($("#stop_forging_modal .show_logout").css("display") == "inline") {
			NRS.logout();
			return;
		}

		$("#forging_indicator").removeClass("forging");
		$("#forging_indicator span").html("Not forging");

		NRS.isForging = false;

		if (response.foundAndStopped) {
			$.growl("Forging stopped successfully.", {
				type: 'success'
			});
		} else {
			$.growl("You weren't forging to begin with.", {
				type: 'danger'
			});
		}
	}

	$("#forging_indicator").click(function(e) {
		e.preventDefault();

		if (NRS.downloadingBlockchain) {
			$.growl("块链正在下载中，此时您无法锻造，请在块链下载完成后再试一次.", {
				"type": "danger"
			});
		} else if (NRS.state.isScanning) {
			$.growl("块链正在重新扫描，这段时间内您无法锻造，请一分钟后再试.", {
				"type": "danger"
			});
		} else if (!NRS.accountInfo.publicKey) {
			$.growl("因为您的帐号没有公钥，所以无法锻造，请先发送第一笔交易.", {
				"type": "danger"
			});
		} else if (NRS.accountInfo.effectiveBalanceNXT == 0) {
			if (NRS.lastBlockHeight >= NRS.accountInfo.currentLeasingHeightFrom && NRS.lastBlockHeight <= NRS.accountInfo.currentLeasingHeightTo) {
				$.growl("您的有效余额已出租，租用期内您暂时无法锻造.", {
					"type": "danger"
				});
			} else {
				$.growl("您的有效余额是0，无法进行锻造.", {
					"type": "danger"
				});
			}
		} else if ($(this).hasClass("forging")) {
			$("#stop_forging_modal").modal("show");
		} else {
			$("#start_forging_modal").modal("show");
		}
	});

	return NRS;
}(NRS || {}, jQuery));