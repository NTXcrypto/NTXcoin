var NRS = (function(NRS, $, undefined) {
	NRS.newlyCreatedAccount = false;

	NRS.allowLoginViaEnter = function() {
		$("#login_password").keypress(function(e) {
			if (e.which == '13') {
				e.preventDefault();
				var password = $("#login_password").val();
				NRS.login(password);
			}
		});
	}

	NRS.showLoginOrWelcomeScreen = function() {
		if (NRS.hasLocalStorage && localStorage.getItem("logged_in")) {
			NRS.showLoginScreen();
		} else {
			NRS.showWelcomeScreen();
		}
	}

	NRS.showLoginScreen = function() {
		$("#account_phrase_custom_panel, #account_phrase_generator_panel, #welcome_panel, #custom_passphrase_link").hide();
		$("#account_phrase_custom_panel :input:not(:button):not([type=submit])").val("");
		$("#account_phrase_generator_panel :input:not(:button):not([type=submit])").val("");
		$("#login_panel").show();
		setTimeout(function() {
			$("#login_password").focus()
		}, 10);
	}

	NRS.showWelcomeScreen = function() {
		$("#login_panel, account_phrase_custom_panel, #account_phrase_generator_panel, #account_phrase_custom_panel, #welcome_panel, #custom_passphrase_link").hide();
		$("#welcome_panel").show();
	}

	NRS.registerUserDefinedAccount = function() {
		$("#account_phrase_generator_panel, #login_panel, #welcome_panel, #custom_passphrase_link").hide();
		$("#account_phrase_custom_panel :input:not(:button):not([type=submit])").val("");
		$("#account_phrase_generator_panel :input:not(:button):not([type=submit])").val("");
		$("#account_phrase_custom_panel").show();
		$("#registration_password").focus();
	}

	NRS.registerAccount = function() {
		$("#login_panel, #welcome_panel").hide();
		$("#account_phrase_generator_panel").show();
		$("#account_phrase_generator_panel step_3 .callout").hide();

		var $loading = $("#account_phrase_generator_loading");
		var $loaded = $("#account_phrase_generator_loaded");

		if (window.crypto || window.msCrypto) {
			$loading.find("span.loading_text").html("正在创建您的超级密码，请稍等.");
		}

		$loading.show();
		$loaded.hide();

		if (typeof PassPhraseGenerator == "undefined") {
			$.when(
				$.getScript("js/crypto/3rdparty/seedrandom.js"),
				$.getScript("js/crypto/passphrasegenerator.js")
			).done(function() {
				$loading.hide();
				$loaded.show();

				PassPhraseGenerator.generatePassPhrase("#account_phrase_generator_panel");
			}).fail(function(jqxhr, settings, exception) {
				alert("无法加载词库...");
			});
		} else {
			$loading.hide();
			$loaded.show();

			PassPhraseGenerator.generatePassPhrase("#account_phrase_generator_panel");
		}
	}

	NRS.verifyGeneratedPassphrase = function() {
		var password = $.trim($("#account_phrase_generator_panel .step_3 textarea").val());

		if (password != PassPhraseGenerator.passPhrase) {
			$("#account_phrase_generator_panel .step_3 .callout").show();
		} else {
			NRS.newlyCreatedAccount = true;
			NRS.login(password, function() {
				$.growl("密码确认成功，您现已成功登陆.", {
					"type": "success"
				});
			});
			PassPhraseGenerator.reset();
			$("#account_phrase_generator_panel textarea").val("");
			$("#account_phrase_generator_panel .step_3 .callout").hide();
		}
	}

	$("#account_phrase_custom_panel form").submit(function(event) {
		event.preventDefault()

		var password = $("#registration_password").val();
		var repeat = $("#registration_password_repeat").val();

		var error = "";

		if (password.length < 35) {
			error = "密码必须至少有35个字符.";
		} else if (password.length < 50 && (!password.match(/[A-Z]/) || !password.match(/[0-9]/))) {
			error = "如果您的密码少于50个字符，那就必须要包含数字和大小写字母的组合.";
		} else if (password != repeat) {
			error = "密码不符.";
		}

		if (error) {
			$("#account_phrase_custom_panel .callout").first().removeClass("callout-info").addClass("callout-danger").html(error);
		} else {
			$("#registration_password, #registration_password_repeat").val("");
			NRS.login(password, function() {
				$.growl("密码确认成功，您现已成功登陆.", {
					"type": "success"
				});
			});
		}
	});

	NRS.login = function(password, callback) {
		$("#login_password, #registration_password, #registration_password_repeat").val("");

		if (!password.length) {
			$.growl("您必须输入你的密码，如果你没有密码，点击以下的注册按钮.", {
				"type": "danger",
				"offset": 10
			});
			return;
		}

		NRS.sendRequest("getBlockchainStatus", function(response) {
			if (response.errorCode) {
				$.growl("Could not connect to server.", {
					"type": "danger",
					"offset": 10
				});

				return;
			}

			NRS.state = response;

			//this is done locally..
			NRS.sendRequest("getAccountId", {
				"secretPhrase": password
			}, function(response) {
				if (!response.errorCode) {
					NRS.account = String(response.accountId).escapeHTML();
				}

				if (!NRS.account) {
					return;
				}

				var nxtAddress = new NxtAddress();

				if (nxtAddress.set(NRS.account)) {
					NRS.accountRS = nxtAddress.toString();
				} else {
					$.growl("无法创建帐户地址.", {
						"type": "danger"
					});
				}

				NRS.sendRequest("getAccountPublicKey", {
					"account": NRS.account
				}, function(response) {
					if (response && response.publicKey && response.publicKey != NRS.generatePublicKey(password)) {
						$.growl("该帐户已被使用，请重新选择.", {
							"type": "danger",
							"offset": 10
						});
						return;
					}

					if ($("#remember_password").is(":checked")) {
						NRS.rememberPassword = true;
						$("#remember_password").prop("checked", false);
						sessionStorage.setItem("secret", password);
						$.growl("请记得退出登陆以清除本机密码.", {
							"type": "danger"
						});
						$(".secret_phrase, .show_secret_phrase").hide();
						$(".hide_secret_phrase").show();
					}

					if (NRS.settings["reed_solomon"]) {
						$("#account_id").html(String(NRS.accountRS).escapeHTML()).css("font-size", "12px");
					} else {
						$("#account_id").html(String(NRS.account).escapeHTML()).css("font-size", "14px");
					}

					var passwordNotice = "";

					if (password.length < 35) {
						passwordNotice = "您的密码少于35个字符，这是很不安全的.";
					} else if (password.length < 50 && (!password.match(/[A-Z]/) || !password.match(/[0-9]/))) {
						passwordNotice = "您的密码不包含数字和大小写字母，这是很不安全的.";
					}

					if (passwordNotice) {
						$.growl("<strong>注意</strong>: " + passwordNotice, {
							"type": "danger"
						});
					}

					NRS.getAccountInfo(true, function() {
						if (NRS.accountInfo.currentLeasingHeightFrom) {
							NRS.isLeased = (NRS.lastBlockHeight >= NRS.accountInfo.currentLeasingHeightFrom && NRS.lastBlockHeight <= NRS.accountInfo.currentLeasingHeightTo);
						} else {
							NRS.isLeased = false;
						}

						//forging requires password to be sent to the server, so we don't do it automatically if not localhost
						if (!NRS.accountInfo.publicKey || NRS.accountInfo.effectiveBalanceNXT == 0 || !NRS.isLocalHost || NRS.downloadingBlockchain || NRS.isLeased) {
							$("#forging_indicator").removeClass("forging");
							$("#forging_indicator span").html("未锻造");
							$("#forging_indicator").show();
							NRS.isForging = false;
						} else if (NRS.isLocalHost) {
							NRS.sendRequest("startForging", {
								"secretPhrase": password
							}, function(response) {
								if ("deadline" in response) {
									$("#forging_indicator").addClass("forging");
									$("#forging_indicator span").html("锻造中");
									NRS.isForging = true;
								} else {
									$("#forging_indicator").removeClass("forging");
									$("#forging_indicator span").html("未锻造");
									NRS.isForging = false;
								}
								$("#forging_indicator").show();
							});
						}
					});

					//NRS.getAccountAliases();

					NRS.unlock();

					if (NRS.isOutdated) {
						$.growl("NRS已有更新版本，请升级.", {
							"type": "danger"
						});
					}

					NRS.setupClipboardFunctionality();

					if (callback) {
						callback();
					}

					NRS.checkLocationHash(password);

					$(window).on("hashchange", NRS.checkLocationHash);

					NRS.getInitialTransactions();
				});
			});
		});
	}

	$("#logout_button_container").on("show.bs.dropdown", function(e) {
		if (!NRS.isForging) {
			e.preventDefault();
		}
	});

	NRS.showLockscreen = function() {
		if (NRS.hasLocalStorage && localStorage.getItem("logged_in")) {
			setTimeout(function() {
				$("#login_password").focus()
			}, 10);
		} else {
			NRS.showWelcomeScreen();
		}

		$("#center").show();
	}

	NRS.unlock = function() {
		if (NRS.hasLocalStorage && !localStorage.getItem("logged_in")) {
			localStorage.setItem("logged_in", true);
		}

		var userStyles = ["header", "sidebar", "page_header"];

		for (var i = 0; i < userStyles.length; i++) {
			var color = NRS.settings[userStyles[i] + "_color"];
			if (color) {
				NRS.updateStyle(userStyles[i], color);
			}
		}

		var contentHeaderHeight = $(".content-header").height();
		var navBarHeight = $("nav.navbar").height();

		$(".content-splitter-right").css("bottom", (contentHeaderHeight + navBarHeight + 10) + "px");

		$("#lockscreen").hide();
		$("body, html").removeClass("lockscreen");

		$(document.documentElement).scrollTop(0);
	}

	$("#logout_button").click(function(e) {
		if (!NRS.isForging) {
			e.preventDefault();
			NRS.logout();
		}
	});

	NRS.logout = function(stopForging) {
		if (stopForging && NRS.isForging) {
			$("#stop_forging_modal .show_logout").show();
			$("#stop_forging_modal").modal("show");
		} else {
			if (NRS.rememberPassword) {
				sessionStorage.removeItem("secret");
			}
			window.location.reload();
		}
	}

	return NRS;
}(NRS || {}, jQuery));