﻿var NRS = (function(NRS, $, undefined) {
	NRS.assets = [];
	NRS.assetIds = [];
	NRS.closedGroups = [];
	NRS.assetSearch = false;
	NRS.lastIssuerCheck = false;
	NRS.viewingAsset = false; //viewing non-bookmarked asset

	NRS.pages.asset_exchange = function(callback) {
		NRS.pageLoading();

		$(".content.content-stretch:visible").width($(".page:visible").width());

		NRS.assets = [];
		NRS.assetIds = [];

		if (NRS.databaseSupport) {
			NRS.database.select("assets", null, function(error, assets) {
				//select already bookmarked assets
				$.each(assets, function(index, asset) {
					NRS.cacheAsset(asset);
				});

				//check owned assets, see if any are not yet in bookmarked assets
				if (NRS.accountInfo.unconfirmedAssetBalances) {
					var newAssetIds = [];

					$.each(NRS.accountInfo.unconfirmedAssetBalances, function(key, assetBalance) {
						if (NRS.assetIds.indexOf(assetBalance.asset) == -1) {
							newAssetIds.push(assetBalance.asset);
							NRS.assetIds.push(assetBalance.asset);
						}
					});

					//add to bookmarked assets
					if (newAssetIds.length) {
						var qs = [];

						for (var i = 0; i < newAssetIds.length; i++) {
							qs.push("assets=" + encodeURIComponent(newAssetIds[i]));
						}

						qs = qs.join("&");
						//first get the assets info
						NRS.sendRequest("getAssets+", {
							//special request.. ugly hack.. also does POST due to URL max length
							"querystring": qs
						}, function(response) {
							if (response.assets && response.assets.length) {
								NRS.saveAssetBookmarks(response.assets, function() {
									NRS.loadAssetExchangeSidebar(callback);
								});
							} else {
								NRS.loadAssetExchangeSidebar(callback);
							}
						});
					} else {
						NRS.loadAssetExchangeSidebar(callback);
					}
				} else {
					NRS.loadAssetExchangeSidebar(callback);
				}
			});

			/*
			//find new assets from contacts and asset issuers, check once every 30 minutes..
			if (!NRS.lastIssuerCheck || (new Date().getTime() - NRS.lastIssuerCheck.getTime()) / 1000 > 60 * 30) {
				NRS.lastIssuerCheck = new Date();

				NRS.database.select("assetIssuers", null, function(error, issuers) {
					var accounts = [];

					$.each(issuers, function(index, issuer) {
						accounts.push(issuer.account);
					});

					$.each(NRS.contacts, function(index, contact) {
						if (accounts.indexOf(contact.accountRS) == -1) {
							accounts.push(contact.accountRS);
						}
					});

					if (accounts.length) {
						var qs = [];

						for (var i = 0; i < accounts.length; i++) {
							qs.push("account=" + encodeURIComponent(accounts[i]));
						}

						qs = qs.join("&");

						NRS.sendRequest("getAssetsByIssuer+", {
							"querystring": qs
						}, function(response) {
							if (response.assets && response.assets.length) {
								var newAssets = [];

								$.each(response.assets, function(key, issuer) {
									$.each(issuer, function(key, asset) {
										newAssets.push(asset);
									});
								});

								if (newAssets.length) {
									NRS.saveAssetBookmarks(newAssets, function(newAssets) {
										if (newAssets.length) {
											NRS.pages.asset_exchange();
										}
									});
								}
							}
						});
					}
				});
			}*/
		} else {
			//for users without db support, we only need to fetch owned assets
			if (NRS.accountInfo.unconfirmedAssetBalances) {
				var qs = [];

				$.each(NRS.accountInfo.unconfirmedAssetBalances, function(key, assetBalance) {
					qs.push("assets=" + encodeURIComponent(assetBalance.asset));
				});
				qs = qs.join("&");

				NRS.sendRequest("getAssets+", {
					"querystring": qs
				}, function(response) {
					if (response.assets && response.assets.length) {
						$.each(response.assets, function(key, asset) {
							NRS.cacheAsset(asset);
						});
					}
					NRS.loadAssetExchangeSidebar(callback);
				});
			} else {
				NRS.loadAssetExchangeSidebar(callback);
			}
		}
	}

	NRS.cacheAsset = function(asset) {
		NRS.assetIds.push(asset.asset);

		if (!asset.groupName) {
			asset.groupName = "";
		}

		var asset = {
			"asset": String(asset.asset),
			"name": String(asset.name).toLowerCase(),
			"description": String(asset.description),
			"groupName": String(asset.groupName).toLowerCase(),
			"account": String(asset.account),
			"accountRS": String(asset.accountRS),
			"quantityQNT": String(asset.quantityQNT),
			"decimals": parseInt(asset.decimals, 10)
		};

		NRS.assets.push(asset);

		return asset;
	}

	NRS.forms.addAssetBookmark = function($modal) {
		var data = NRS.getFormData($modal.find("form:first"));

		data.id = $.trim(data.id);

		if (!data.id) {
			return {
				"error": "资产或者帐户ID是必填字段."
			};
		}

		if (!/^\d+$/.test(data.id) && !/^NTX\-/i.test(data.id)) {
			return {
				"error": "资产或者帐户ID无效."
			};
		}

		if (/^NXT\-/i.test(data.id)) {
			NRS.sendRequest("getAssetsByIssuer", {
				"account": data.id
			}, function(response) {
				if (response.errorCode) {
					NRS.showModalError(response.errorDescription, $modal);
				} else {
					if (response.assets && response.assets[0] && response.assets[0].length) {
						NRS.saveAssetBookmarks(response.assets[0], NRS.forms.addAssetBookmarkComplete);
					} else {
						NRS.showModalError("该帐户下无资产记录.", $modal);
					}
					//NRS.saveAssetIssuer(data.id);
				}
			});
		} else {
			NRS.sendRequest("getAsset", {
				"asset": data.id
			}, function(response) {
				if (response.errorCode) {
					NRS.sendRequest("getAssetsByIssuer", {
						"account": data.id
					}, function(response) {
						if (response.errorCode) {
							NRS.showModalError(response.errorDescription, $modal);
						} else {
							if (response.assets && response.assets[0] && response.assets[0].length) {
								NRS.saveAssetBookmarks(response.assets[0], NRS.forms.addAssetBookmarkComplete);
								//NRS.saveAssetIssuer(data.id);
							} else {
								NRS.showModalError("找不到资产.", $modal);
							}
						}
					});
				} else {
					NRS.saveAssetBookmarks(new Array(response), NRS.forms.addAssetBookmarkComplete);
				}
			});
		}
	}

	$("#asset_exchange_bookmark_this_asset").on("click", function() {
		if (NRS.viewingAsset) {
			NRS.saveAssetBookmarks(new Array(NRS.viewingAsset), function(newAssets) {
				NRS.viewingAsset = false;
				NRS.loadAssetExchangeSidebar(function() {
					$("#asset_exchange_sidebar a[data-asset=" + newAssets[0].asset + "]").addClass("active").trigger("click");
				});
			});
		}
	});

	NRS.forms.addAssetBookmarkComplete = function(newAssets, submittedAssets) {
		NRS.assetSearch = false;

		if (newAssets.length == 0) {
			NRS.closeModal();
			$.growl((submittedAssets.length == 1 ? "Asset" : "Assets") + " 已在书签列表内.", {
				"type": "danger"
			});
			$("#asset_exchange_sidebar a.active").removeClass("active");
			$("#asset_exchange_sidebar a[data-asset=" + submittedAssets[0].asset + "]").addClass("active").trigger("click");
			return;
		} else {
			NRS.closeModal();
			$.growl((newAssets.length == 1 ? "Asset" : newAssets.length + " assets") + " 添加成功.", {
				"type": "success"
			});

			NRS.loadAssetExchangeSidebar(function(callback) {
				$("#asset_exchange_sidebar a.active").removeClass("active");
				$("#asset_exchange_sidebar a[data-asset=" + newAssets[0].asset + "]").addClass("active").trigger("click");
			});
		}
	}

	/*
	NRS.saveAssetIssuer = function(issuer) {
		if (!/^NXT\-/i.test(issuer)) {
			var address = new NxtAddress();

			if (address.set(issuer)) {
				issuer = address.toString();
			} else {
				return;
			}
		}

		NRS.database.select("assetIssuers", [{
			"account": issuer
		}], function(error, exists) {
			if (!error && !exists.length) {
				NRS.database.insert("assetIssuers", [{
					"account": issuer
				}]);
			}
		});
	}*/

	NRS.saveAssetBookmarks = function(assets, callback) {
		var newAssetIds = [];
		var newAssets = [];

		$.each(assets, function(key, asset) {
			newAssetIds.push({
				"asset": String(asset.asset)
			});
			newAssets.push({
				"asset": String(asset.asset),
				"name": String(asset.name),
				"description": String(asset.description),
				"account": String(asset.account),
				"accountRS": String(asset.accountRS),
				"quantityQNT": String(asset.quantityQNT),
				"decimals": parseInt(asset.decimals, 10),
				"groupName": ""
			});
		});

		NRS.database.select("assets", newAssetIds, function(error, existingAssets) {
			var existingIds = [];

			if (existingAssets.length) {
				$.each(existingAssets, function(index, asset) {
					existingIds.push(asset.asset);
				});

				newAssets = $.grep(newAssets, function(v) {
					return (existingIds.indexOf(v.asset) === -1);
				});
			}

			if (newAssets.length == 0) {
				if (callback) {
					callback([], assets);
				}
			} else {
				NRS.database.insert("assets", newAssets, function(error) {
					$.each(newAssets, function(key, asset) {
						asset.name = asset.name.toLowerCase();
						NRS.assetIds.push(asset.asset);
						NRS.assets.push(asset);
					});

					if (callback) {
						//for some reason we need to wait a little or DB won't be able to fetch inserted record yet..
						setTimeout(function() {
							callback(newAssets, assets);
						}, 50);
					}
				});
			}
		});
	}

	NRS.positionAssetSidebar = function() {
		$("#asset_exchange_sidebar").parent().css("position", "relative");
		$("#asset_exchange_sidebar").parent().css("padding-bottom", "5px");
		$("#asset_exchange_sidebar_content").height($(window).height() - 120);
		$("#asset_exchange_sidebar").height($(window).height() - 120);
	}

	//called on opening the asset exchange page and automatic refresh
	NRS.loadAssetExchangeSidebar = function(callback) {
		if (!NRS.assets.length) {
			NRS.pageLoaded();
			$("#asset_exchange_sidebar_content").empty();
			$("#no_asset_selected, #loading_asset_data, #no_asset_search_results").hide();
			$("#no_assets_available").show();
			$("#asset_exchange_page").addClass("no_assets");
			return;
		}

		var rows = "";

		$("#asset_exchange_page").removeClass("no_assets");

		NRS.positionAssetSidebar();

		NRS.assets.sort(function(a, b) {
			if (!a.groupName && !b.groupName) {
				if (a.name > b.name) {
					return 1;
				} else if (a.name < b.name) {
					return -1;
				} else {
					return 0;
				}
			} else if (!a.groupName) {
				return 1;
			} else if (!b.groupName) {
				return -1;
			} else if (a.groupName > b.groupName) {
				return 1;
			} else if (a.groupName < b.groupName) {
				return -1;
			} else {
				if (a.name > b.name) {
					return 1;
				} else if (a.name < b.name) {
					return -1;
				} else {
					return 0;
				}
			}
		});

		var lastGroup = "";
		var ungrouped = true;
		var isClosedGroup = false;

		var isSearch = NRS.assetSearch !== false;
		var searchResults = 0;

		for (var i = 0; i < NRS.assets.length; i++) {
			var asset = NRS.assets[i];

			if (isSearch) {
				if (NRS.assetSearch.indexOf(asset.asset) == -1) {
					continue;
				} else {
					searchResults++;
				}
			}

			if (asset.groupName.toLowerCase() != lastGroup) {
				var to_check = (asset.groupName ? asset.groupName : "undefined");

				if (NRS.closedGroups.indexOf(to_check) != -1) {
					isClosedGroup = true;
				} else {
					isClosedGroup = false;
				}

				if (asset.groupName) {
					ungrouped = false;
					rows += "<a href='#' class='list-group-item list-group-item-header" + (asset.groupName == "Ignore List" ? " no-context" : "") + "'" + (asset.groupName != "Ignore List" ? " data-context='asset_exchange_sidebar_group_context' " : "data-context=''") + " data-groupname='" + asset.groupName.escapeHTML() + "' data-closed='" + isClosedGroup + "'><h4 class='list-group-item-heading'>" + asset.groupName.toUpperCase().escapeHTML() + "</h4><i class='fa fa-angle-" + (isClosedGroup ? "right" : "down") + " group_icon'></i></h4></a>";
				} else {
					ungrouped = true;
					rows += "<a href='#' class='list-group-item list-group-item-header no-context' data-closed='" + isClosedGroup + "'><h4 class='list-group-item-heading'>未分组 <i class='fa pull-right fa-angle-" + (isClosedGroup ? "right" : "down") + "'></i></h4></a>";
				}

				lastGroup = asset.groupName.toLowerCase();
			}

			var ownsAsset = false;

			if (NRS.accountInfo.assetBalances) {
				$.each(NRS.accountInfo.assetBalances, function(key, assetBalance) {
					if (assetBalance.asset == asset.asset && assetBalance.balanceQNT != "0") {
						ownsAsset = true;
						return false;
					}
				});
			}

			rows += "<a href='#' class='list-group-item list-group-item-" + (ungrouped ? "ungrouped" : "grouped") + (ownsAsset ? " owns_asset" : " not_owns_asset") + "' data-cache='" + i + "' data-asset='" + String(asset.asset).escapeHTML() + "'" + (!ungrouped ? " data-groupname='" + asset.groupName.escapeHTML() + "'" : "") + (isClosedGroup ? " style='display:none'" : "") + " data-closed='" + isClosedGroup + "'><h4 class='list-group-item-heading'>" + asset.name.escapeHTML() + "</h4><p class='list-group-item-text'>qty: " + NRS.formatQuantity(asset.quantityQNT, asset.decimals) + "</p></a>";
		}

		var active = $("#asset_exchange_sidebar a.active");


		if (active.length) {
			active = active.data("asset");
		} else {
			active = false;
		}

		$("#asset_exchange_sidebar_content").empty().append(rows);
		$("#asset_exchange_sidebar_search").show();

		if (isSearch) {
			if (active && NRS.assetSearch.indexOf(active) != -1) {
				//check if currently selected asset is in search results, if so keep it at that
				$("#asset_exchange_sidebar a[data-asset=" + active + "]").addClass("active");
			} else if (NRS.assetSearch.length == 1) {
				//if there is only 1 search result, click it
				$("#asset_exchange_sidebar a[data-asset=" + NRS.assetSearch[0] + "]").addClass("active").trigger("click");
			}
		} else if (active) {
			$("#asset_exchange_sidebar a[data-asset=" + active + "]").addClass("active");
		}

		if (isSearch || NRS.assets.length >= 10) {
			$("#asset_exchange_sidebar_search").show();
		} else {
			$("#asset_exchange_sidebar_search").hide();
		}

		if (isSearch && NRS.assetSearch.length == 0) {
			$("#no_asset_search_results").show();
			$("#asset_details, #no_asset_selected, #no_assets_available").hide();
		} else if (!$("#asset_exchange_sidebar a.active").length) {
			$("#no_asset_selected").show();
			$("#asset_details, #no_assets_available, #no_asset_search_results").hide();
		} else if (active) {
			$("#no_assets_available, #no_asset_selected, #no_asset_search_results").hide();
		}

		if (NRS.viewingAsset) {
			$("#asset_exchange_bookmark_this_asset").show();
		} else {
			$("#asset_exchange_bookmark_this_asset").hide();
		}

		NRS.pageLoaded(callback);
	}

	NRS.incoming.asset_exchange = function() {
		if (!NRS.viewingAsset) {
			//refresh active asset
			var $active = $("#asset_exchange_sidebar a.active");

			if ($active.length) {
				$active.trigger("click", [{
					"refresh": true
				}]);
			}
		} else {
			NRS.loadAsset(NRS.viewingAsset, true);
		}

		//update assets owned (colored)
		$("#asset_exchange_sidebar a.list-group-item.owns_asset").removeClass("owns_asset").addClass("not_owns_asset");

		if (NRS.accountInfo.assetBalances) {
			$.each(NRS.accountInfo.assetBalances, function(key, assetBalance) {
				if (assetBalance.balanceQNT != "0") {
					$("#asset_exchange_sidebar a.list-group-item[data-asset=" + assetBalance.asset + "]").addClass("owns_asset").removeClass("not_owns_asset");
				}
			});
		}
	}

	$("#asset_exchange_sidebar").on("click", "a", function(e, data) {
		e.preventDefault();

		var assetId = $(this).data("asset");

		//refresh is true if data is refreshed automatically by the system (when a new block arrives)
		if (data && data.refresh) {
			var refresh = true;
		} else {
			var refresh = false;
		}

		//clicked on a group
		if (!assetId) {
			if (NRS.databaseSupport) {
				var group = $(this).data("groupname");
				var closed = $(this).data("closed");

				if (!group) {
					var $links = $("#asset_exchange_sidebar a.list-group-item-ungrouped");
				} else {
					var $links = $("#asset_exchange_sidebar a.list-group-item-grouped[data-groupname='" + group.escapeHTML() + "']");
				}

				if (!group) {
					group = "undefined";
				}

				if (closed) {
					var pos = NRS.closedGroups.indexOf(group);
					if (pos >= 0) {
						NRS.closedGroups.splice(pos);
					}
					$(this).data("closed", "");
					$(this).find("i").removeClass("fa-angle-right").addClass("fa-angle-down");
					$links.show();
				} else {
					NRS.closedGroups.push(group);
					$(this).data("closed", true);
					$(this).find("i").removeClass("fa-angle-down").addClass("fa-angle-right");
					$links.hide();
				}

				NRS.database.update("data", {
					"contents": NRS.closedGroups.join("#")
				}, [{
					"id": "closed_groups"
				}]);
			}

			return;
		}

		assetId = assetId.escapeHTML();

		if (NRS.databaseSupport) {
			NRS.database.select("assets", [{
				"asset": assetId
			}], function(error, asset) {
				if (!error) {
					NRS.loadAsset(asset[0], refresh);
				}
			});
		} else {
			NRS.sendRequest("getAsset+", {
				"asset": assetId
			}, function(response, input) {
				if (!response.errorCode) {
					NRS.loadAsset(response, refresh);
				}
			});
		}
	});

	NRS.loadAsset = function(asset, refresh) {
		var assetId = asset.asset;

		NRS.currentAsset = asset;
		NRS.currentSubPage = assetId;

		if (!refresh) {
			$("#asset_exchange_sidebar a.active").removeClass("active");
			$("#asset_exchange_sidebar a[data-asset=" + assetId + "]").addClass("active");

			$("#no_asset_selected, #loading_asset_data, #no_assets_available, #no_asset_search_results").hide();
			$("#asset_details").show().parent().animate({
				"scrollTop": 0
			}, 0);

			$("#asset_account").html("<a href='#' data-user='" + NRS.getAccountFormatted(asset, "account") + "' class='user_info'>" + NRS.getAccountTitle(asset, "account") + "</a>");
			$("#asset_id").html(assetId.escapeHTML());
			$("#asset_decimals").html(String(asset.decimals).escapeHTML());
			$("#asset_name").html(String(asset.name).escapeHTML());
			$("#asset_description").html(String(asset.description).autoLink());
			$("#asset_quantity").html(NRS.formatQuantity(asset.quantityQNT, asset.decimals));

			$(".asset_name").html(String(asset.name).escapeHTML());
			$("#sell_asset_button").data("asset", assetId);
			$("#buy_asset_button").data("asset", assetId);

			$("#sell_asset_price, #buy_asset_price").val("");
			$("#sell_asset_quantity, #sell_asset_total, #buy_asset_quantity, #buy_asset_total").val("0");

			$("#asset_exchange_ask_orders_table tbody").empty();
			$("#asset_exchange_bid_orders_table tbody").empty();
			$("#asset_exchange_trade_history_table tbody").empty();
			$("#asset_exchange_ask_orders_table").parent().addClass("data-loading").removeClass("data-empty");
			$("#asset_exchange_bid_orders_table").parent().addClass("data-loading").removeClass("data-empty");
			$("#asset_exchange_trade_history_table").parent().addClass("data-loading").removeClass("data-empty");

			$(".data-loading img.loading").hide();

			setTimeout(function() {
				$(".data-loading img.loading").fadeIn(200);
			}, 200);

			var nrDuplicates = 0;

			$.each(NRS.assets, function(key, singleAsset) {
				if (String(singleAsset.name).toLowerCase() == String(asset.name).toLowerCase() && singleAsset.asset != assetId) {
					nrDuplicates++;
				}
			});

			if (nrDuplicates >= 1) {
				$("#asset_exchange_duplicates_warning span").html((nrDuplicates == 1 ? " is " : " are ") + nrDuplicates + " " + (nrDuplicates == 1 ? "other asset" : "other assets"));
				$("#asset_exchange_duplicates_warning").show();
			} else {
				$("#asset_exchange_duplicates_warning").hide();
			}

			if (NRS.databaseSupport) {
				NRS.sendRequest("getAsset", {
					"asset": assetId
				}, function(response) {
					if (!response.errorCode) {
						if (response.asset != asset.asset || response.account != asset.account || response.accountRS != asset.accountRS || response.decimals != asset.decimals || response.description != asset.description || response.name != asset.name || response.quantityQNT != asset.quantityQNT) {
							NRS.database.delete("assets", [{
								"asset": asset.asset
							}], function() {
								setTimeout(function() {
									NRS.pages.asset_exchange();
									$.growl("Invalid asset.", {
										"type": "danger"
									});
								}, 50);
							});
						}
					}
				});
			}

			if (asset.viewingAsset) {
				$("#asset_exchange_bookmark_this_asset").show();
				NRS.viewingAsset = asset;
			} else {
				$("#asset_exchange_bookmark_this_asset").hide();
				NRS.viewingAsset = false;
			}
		}

		if (NRS.accountInfo.unconfirmedBalanceNQT == "0") {
			$("#your_nxt_balance").html("0");
			$("#buy_automatic_price").addClass("zero").removeClass("nonzero");
		} else {
			$("#your_nxt_balance").html(NRS.formatAmount(NRS.accountInfo.unconfirmedBalanceNQT));
			$("#buy_automatic_price").addClass("nonzero").removeClass("zero");
		}

		if (NRS.accountInfo.unconfirmedAssetBalances) {
			for (var i = 0; i < NRS.accountInfo.unconfirmedAssetBalances.length; i++) {
				var balance = NRS.accountInfo.unconfirmedAssetBalances[i];

				if (balance.asset == assetId) {
					NRS.currentAsset.yourBalanceNQT = balance.unconfirmedBalanceQNT;
					$("#your_asset_balance").html(NRS.formatQuantity(balance.unconfirmedBalanceQNT, NRS.currentAsset.decimals));
					if (balance.unconfirmedBalanceQNT == "0") {
						$("#sell_automatic_price").addClass("zero").removeClass("nonzero");
					} else {
						$("#sell_automatic_price").addClass("nonzero").removeClass("zero");
					}
					break;
				}
			}
		}

		if (!NRS.currentAsset.yourBalanceNQT) {
			NRS.currentAsset.yourBalanceNQT = "0";
			$("#your_asset_balance").html("0");
		}

		NRS.loadAssetOrders("ask", assetId, refresh);
		NRS.loadAssetOrders("bid", assetId, refresh);

		//todo NRS.currentSubPageID ??...
		NRS.sendRequest("getTrades+" + assetId, {
			"asset": assetId,
			"firstIndex": 0,
			"lastIndex": 50
		}, function(response, input) {
			if (response.trades && response.trades.length) {
				var trades = response.trades;

				var rows = "";

				for (var i = 0; i < trades.length; i++) {
					trades[i].priceNQT = new BigInteger(trades[i].priceNQT);
					trades[i].quantityQNT = new BigInteger(trades[i].quantityQNT);
					trades[i].totalNQT = new BigInteger(NRS.calculateOrderTotalNQT(trades[i].priceNQT, trades[i].quantityQNT));

					rows += "<tr><td>" + NRS.formatTimestamp(trades[i].timestamp) + "</td><td>" + NRS.formatQuantity(trades[i].quantityQNT, NRS.currentAsset.decimals) + "</td><td class='asset_price'>" + NRS.formatOrderPricePerWholeQNT(trades[i].priceNQT, NRS.currentAsset.decimals) + "</td><td>" + NRS.formatAmount(trades[i].totalNQT) + "</td><td>" + String(trades[i].askOrder).escapeHTML() + "</td><td>" + String(trades[i].bidOrder).escapeHTML() + "</td></tr>";
				}

				$("#asset_exchange_trade_history_table tbody").empty().append(rows);
				NRS.dataLoadFinished($("#asset_exchange_trade_history_table"), !refresh);
			} else {
				$("#asset_exchange_trade_history_table tbody").empty();
				NRS.dataLoadFinished($("#asset_exchange_trade_history_table"), !refresh);
			}
		});
	}

	NRS.loadAssetOrders = function(type, assetId, refresh) {
		type = type.toLowerCase();

		NRS.sendRequest("get" + type.capitalize() + "Orders+" + assetId, {
			"asset": assetId,
			"timestamp": 0,
			"limit": 50
		}, function(response, input) {
			var orders = response[type + "Orders"];

			if (!orders) {
				orders = [];
			}

			if (NRS.unconfirmedTransactions.length) {
				var added = false;

				for (var i = 0; i < NRS.unconfirmedTransactions.length; i++) {
					var unconfirmedTransaction = NRS.unconfirmedTransactions[i];
					unconfirmedTransaction.order = unconfirmedTransaction.transaction;

					if (unconfirmedTransaction.type == 2 && (type == "ask" ? unconfirmedTransaction.subtype == 2 : unconfirmedTransaction.subtype == 3) && unconfirmedTransaction.asset == assetId) {
						orders.push($.extend(true, {}, unconfirmedTransaction)); //make sure it's a deep copy
						added = true;
					}
				}

				if (added) {
					orders.sort(function(a, b) {
						if (type == "ask") {
							//lowest price at the top
							return new BigInteger(a.priceNQT).compareTo(new BigInteger(b.priceNQT));
						} else {
							//highest price at the top
							return new BigInteger(b.priceNQT).compareTo(new BigInteger(a.priceNQT));
						}
					});
				}
			}

			if (orders.length) {
				$("#" + (type == "ask" ? "sell" : "buy") + "_orders_count").html("(" + orders.length + (orders.length == 50 ? "+" : "") + ")");

				var rows = "";

				for (var i = 0; i < orders.length; i++) {
					var order = orders[i];

					order.priceNQT = new BigInteger(order.priceNQT);
					order.quantityQNT = new BigInteger(order.quantityQNT);
					order.totalNQT = new BigInteger(NRS.calculateOrderTotalNQT(order.quantityQNT, order.priceNQT));

					if (i == 0 && !refresh) {
						$("#" + (type == "ask" ? "buy" : "sell") + "_asset_price").val(NRS.calculateOrderPricePerWholeQNT(order.priceNQT, NRS.currentAsset.decimals));
					}

					var className = (order.account == NRS.account ? "your-order" : "") + (order.unconfirmed ? " tentative" : (NRS.isUserCancelledOrder(order) ? " tentative tentative-crossed" : ""));

					rows += "<tr class='" + className + "' data-transaction='" + String(order.order).escapeHTML() + "' data-quantity='" + order.quantityQNT.toString().escapeHTML() + "' data-price='" + order.priceNQT.toString().escapeHTML() + "'><td>" + (order.unconfirmed ? "You - <strong>Pending</strong>" : (order.account == NRS.account ? "<strong>You</strong>" : "<a href='#' data-user='" + NRS.getAccountFormatted(order, "account") + "' class='user_info'>" + (order.account == NRS.currentAsset.account ? "Asset Issuer" : NRS.getAccountTitle(order, "account")) + "</a>")) + "</td><td>" + NRS.formatQuantity(order.quantityQNT, NRS.currentAsset.decimals) + "</td><td>" + NRS.formatOrderPricePerWholeQNT(order.priceNQT, NRS.currentAsset.decimals) + "</td><td>" + NRS.formatAmount(order.totalNQT) + "</tr>";
				}

				$("#asset_exchange_" + type + "_orders_table tbody").empty().append(rows);
			} else {
				$("#asset_exchange_" + type + "_orders_table tbody").empty();
				if (!refresh) {
					$("#" + (type == "ask" ? "buy" : "sell") + "_asset_price").val("0");
				}
				$("#" + (type == "ask" ? "sell" : "buy") + "_orders_count").html("");
			}

			NRS.dataLoadFinished($("#asset_exchange_" + type + "_orders_table"), !refresh);
		});
	}

	NRS.isUserCancelledOrder = function(order) {
		if (NRS.unconfirmedTransactions.length) {
			for (var i = 0; i < NRS.unconfirmedTransactions.length; i++) {
				var unconfirmedTransaction = NRS.unconfirmedTransactions[i];

				if (unconfirmedTransaction.type == 2 && (order.type == "ask" ? unconfirmedTransaction.subtype == 4 : unconfirmedTransaction.subtype == 5) && unconfirmedTransaction.attachment.order == order.order) {
					return true;
				}
			}
		}

		return false;
	}

	$("#asset_exchange_search").on("submit", function(e) {
		e.preventDefault();
		$("#asset_exchange_search input[name=q]").trigger("input");
	});

	$("#asset_exchange_search input[name=q]").on("input", function(e) {
		var input = $.trim($(this).val()).toLowerCase();

		if (!input) {
			NRS.assetSearch = false;
			NRS.loadAssetExchangeSidebar();
			$("#asset_exchange_clear_search").hide();
		} else {
			NRS.assetSearch = [];

			if (/NTX\-/i.test(input)) {
				$.each(NRS.assets, function(key, asset) {
					if (asset.accountRS.toLowerCase() == input || asset.accountRS.toLowerCase().indexOf(input) !== -1) {
						NRS.assetSearch.push(asset.asset);
					}
				});
			} else {
				$.each(NRS.assets, function(key, asset) {
					if (asset.account == input || asset.asset == input || asset.name.toLowerCase().indexOf(input) !== -1) {
						NRS.assetSearch.push(asset.asset);
					}
				});
			}
			/*
			if (!NRS.assetSearch.length) {
				if ($(".bootstrap-growl-top-right.alert-danger").length == 0) {
					$.growl("Nothing found, please try another query.", {
						"type": "danger"
					});
				}
			} else {*/
			NRS.loadAssetExchangeSidebar();
			$("#asset_exchange_clear_search").show();
			$("#asset_exchange_show_type").hide();
			//	}
		}
	});

	$("#asset_exchange_clear_search").on("click", function() {
		$("#asset_exchange_search input[name=q]").val("");
		$("#asset_exchange_search").trigger("submit");
	});

	$("#buy_asset_box .box-header, #sell_asset_box .box-header").click(function(e) {
		e.preventDefault();
		//Find the box parent        
		var box = $(this).parents(".box").first();
		//Find the body and the footer
		var bf = box.find(".box-body, .box-footer");
		if (!box.hasClass("collapsed-box")) {
			box.addClass("collapsed-box");
			$(this).find(".btn i.fa").removeClass("fa-minus").addClass("fa-plus");
			bf.slideUp();
		} else {
			box.removeClass("collapsed-box");
			bf.slideDown();
			$(this).find(".btn i.fa").removeClass("fa-plus").addClass("fa-minus");
		}
	});

	$("#asset_exchange_bid_orders_table tbody, #asset_exchange_ask_orders_table tbody").on("click", "td", function(e) {
		var $target = $(e.target);

		if ($target.prop("tagName").toLowerCase() == "a") {
			return;
		}

		var type = ($target.closest("table").attr("id") == "asset_exchange_bid_orders_table" ? "sell" : "buy");

		var $tr = $target.closest("tr");

		try {
			var priceNQT = new BigInteger(String($tr.data("price")));
			var quantityQNT = new BigInteger(String($tr.data("quantity")));
			var totalNQT = new BigInteger(NRS.calculateOrderTotalNQT(quantityQNT, priceNQT));

			$("#" + type + "_asset_price").val(NRS.calculateOrderPricePerWholeQNT(priceNQT, NRS.currentAsset.decimals));
			$("#" + type + "_asset_quantity").val(NRS.convertToQNTf(quantityQNT, NRS.currentAsset.decimals));
			$("#" + type + "_asset_total").val(NRS.convertToNXT(totalNQT));
		} catch (err) {
			return;
		}

		if (type == "sell") {
			try {
				var balanceNQT = new BigInteger(NRS.accountInfo.unconfirmedBalanceNQT);
			} catch (err) {
				return;
			}

			if (totalNQT.compareTo(balanceNQT) > 0) {
				$("#" + type + "_asset_total").css({
					"background": "#ED4348",
					"color": "white"
				});
			} else {
				$("#" + type + "_asset_total").css({
					"background": "",
					"color": ""
				});
			}
		}

		var box = $("#" + type + "_asset_box");

		if (box.hasClass("collapsed-box")) {
			box.removeClass("collapsed-box");
			box.find(".box-body").slideDown();
		}
	});

	$("#sell_automatic_price, #buy_automatic_price").on("click", function(e) {
		try {
			var type = ($(this).attr("id") == "sell_automatic_price" ? "sell" : "buy");

			var price = new Big(NRS.convertToNQT(String($("#" + type + "_asset_price").val())));
			var balance = new Big(type == "buy" ? NRS.accountInfo.unconfirmedBalanceNQT : NRS.currentAsset.yourBalanceNQT);
			var balanceNQT = new Big(NRS.accountInfo.unconfirmedBalanceNQT);
			var maxQuantity = new Big(NRS.convertToQNTf(NRS.currentAsset.quantityQNT, NRS.currentAsset.decimals));

			if (balance.cmp(new Big("0")) <= 0) {
				return;
			}

			if (price.cmp(new Big("0")) <= 0) {
				//get minimum price if no offers exist, based on asset decimals..
				price = new Big("" + Math.pow(10, NRS.currentAsset.decimals));
				$("#" + type + "_asset_price").val(NRS.convertToNXT(price.toString()));
			}

			var quantity = new Big(NRS.amountToPrecision((type == "sell" ? balanceNQT : balance).div(price).toString(), NRS.currentAsset.decimals));

			var total = quantity.times(price);

			//proposed quantity is bigger than available quantity
			if (quantity.cmp(maxQuantity) == 1) {
				quantity = maxQuantity;
				total = quantity.times(price);
			}

			if (type == "sell") {
				var maxUserQuantity = new Big(NRS.convertToQNTf(balance, NRS.currentAsset.decimals));
				if (quantity.cmp(maxUserQuantity) == 1) {
					quantity = maxUserQuantity;
					total = quantity.times(price);
				}
			}

			$("#" + type + "_asset_quantity").val(quantity.toString());
			$("#" + type + "_asset_total").val(NRS.convertToNXT(total.toString()));

			$("#" + type + "_asset_total").css({
				"background": "",
				"color": ""
			});
		} catch (err) {}
	});

	function isControlKey(charCode) {
		if (charCode >= 32)
			return false;
		if (charCode == 10)
			return false;
		if (charCode == 13)
			return false;

		return true;
	}

	$("#buy_asset_quantity, #buy_asset_price, #sell_asset_quantity, #sell_asset_price, #buy_asset_fee, #sell_asset_fee").keydown(function(e) {
		var charCode = !e.charCode ? e.which : e.charCode;

		if (isControlKey(charCode) || e.ctrlKey || e.metaKey) {
			return;
		}

		var isQuantityField = /_quantity/i.test($(this).attr("id"));

		var maxFractionLength = (isQuantityField ? NRS.currentAsset.decimals : 8 - NRS.currentAsset.decimals);

		if (maxFractionLength) {
			//allow 1 single period character
			if (charCode == 110 || charCode == 190) {
				if ($(this).val().indexOf(".") != -1) {
					e.preventDefault();
					return false;
				} else {
					return;
				}
			}
		} else {
			//do not allow period
			if (charCode == 110 || charCode == 190 || charCode == 188) {
				$.growl("不允许出现分数.", {
					"type": "danger"
				});
				e.preventDefault();
				return false;
			}
		}

		var input = $(this).val() + String.fromCharCode(charCode);

		var afterComma = input.match(/\.(\d*)$/);

		//only allow as many as there are decimals allowed..
		if (afterComma && afterComma[1].length > maxFractionLength) {
			var selectedText = NRS.getSelectedText();

			if (selectedText != $(this).val()) {
				if (isQuantityField) {
					errorMessage = "该资产仅支持小数点后 " + NRS.currentAsset.decimals + " 位小数.";
				} else {
					errorMessage = "仅支持小数点后 " + (8 - NRS.currentAsset.decimals) + " 位小数.";
				}

				$.growl(errorMessage, {
					"type": "danger"
				});

				e.preventDefault();
				return false;
			}
		}

		//numeric characters, left/right key, backspace, delete
		if (charCode == 8 || charCode == 37 || charCode == 39 || charCode == 46 || (charCode >= 48 && charCode <= 57 && !isNaN(String.fromCharCode(charCode))) || (charCode >= 96 && charCode <= 105)) {
			return;
		} else {
			//comma
			if (charCode == 188) {
				$.growl("逗号是不允许的，请用一个点(.)来代替.", {
					"type": "danger"
				});
			}
			e.preventDefault();
			return false;
		}
	});

	//calculate preview price (calculated on every keypress)
	$("#sell_asset_quantity, #sell_asset_price, #buy_asset_quantity, #buy_asset_price").keyup(function(e) {
		var orderType = $(this).data("type").toLowerCase();

		try {
			var quantityQNT = new BigInteger(NRS.convertToQNT(String($("#" + orderType + "_asset_quantity").val()), NRS.currentAsset.decimals));
			var priceNQT = new BigInteger(NRS.calculatePricePerWholeQNT(NRS.convertToNQT(String($("#" + orderType + "_asset_price").val())), NRS.currentAsset.decimals));

			if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
				$("#" + orderType + "_asset_total").val("0");
			} else {
				var total = NRS.calculateOrderTotal(quantityQNT, priceNQT, NRS.currentAsset.decimals);
				$("#" + orderType + "_asset_total").val(total.toString());
			}
		} catch (err) {
			$("#" + orderType + "_asset_total").val("0");
		}
	});

	$("#asset_order_modal").on("show.bs.modal", function(e) {
		var $invoker = $(e.relatedTarget);

		var orderType = $invoker.data("type");
		var assetId = $invoker.data("asset");

		$("#asset_order_modal_button").html(orderType + " Asset").data("resetText", orderType + " Asset");

		orderType = orderType.toLowerCase();

		try {
			//TODO
			var quantity = String($("#" + orderType + "_asset_quantity").val());
			var quantityQNT = new BigInteger(NRS.convertToQNT(quantity, NRS.currentAsset.decimals));
			var priceNQT = new BigInteger(NRS.calculatePricePerWholeQNT(NRS.convertToNQT(String($("#" + orderType + "_asset_price").val())), NRS.currentAsset.decimals));
			var feeNQT = new BigInteger(NRS.convertToNQT(String($("#" + orderType + "_asset_fee").val())));
			var totalNXT = NRS.formatAmount(NRS.calculateOrderTotalNQT(quantityQNT, priceNQT, NRS.currentAsset.decimals), false, true);
		} catch (err) {
			$.growl("无效输入.", {
				"type": "danger"
			});
			return e.preventDefault();
		}

		if (priceNQT.toString() == "0" || quantityQNT.toString() == "0") {
			$.growl("请填写金额和价格.", {
				"type": "danger"
			});
			return e.preventDefault();
		}

		if (feeNQT.toString() == "0") {
			feeNQT = new BigInteger("100000000");
		}

		var priceNQTPerWholeQNT = priceNQT.multiply(new BigInteger("" + Math.pow(10, NRS.currentAsset.decimals)));

		if (orderType == "buy") {
			var description = "以每个<strong>" + NRS.formatAmount(priceNQTPerWholeQNT, false, true) + " NTX</strong>的价格购买了 <strong>" + NRS.formatQuantity(quantityQNT, NRS.currentAsset.decimals, true) + " " + $("#asset_name").html() + "</strong> 个.";
			var tooltipTitle = "购买单个资产，您将支付 " + NRS.formatAmount(priceNQTPerWholeQNT, false, true) + " NTX, 如果全部购买完，您将支付 " + totalNXT + " NTX .";
		} else {
			var description = " 以每个<strong>" + NRS.formatAmount(priceNQTPerWholeQNT, false, true) + " NTX</strong>的价格销售了<strong>" + NRS.formatQuantity(quantityQNT, NRS.currentAsset.decimals, true) + " " + $("#asset_name").html() + "</strong> 个.";
			var tooltipTitle = "单个资产销售后，您将得到" + NRS.formatAmount(priceNQTPerWholeQNT, false, true) + "NTX, 一旦所有都销售完，总共会得到 " + totalNXT + " NTX.";
		}

		$("#asset_order_description").html(description);
		$("#asset_order_total").html(totalNXT + " NTX");
		$("#asset_order_fee_paid").html(NRS.formatAmount(feeNQT) + " NTX");

		if (quantity != "1") {
			$("#asset_order_total_tooltip").show();
			$("#asset_order_total_tooltip").popover("destroy");
			$("#asset_order_total_tooltip").data("content", tooltipTitle);
			$("#asset_order_total_tooltip").popover({
				"content": tooltipTitle,
				"trigger": "hover"
			});
		} else {
			$("#asset_order_total_tooltip").hide();
		}

		$("#asset_order_type").val((orderType == "buy" ? "placeBidOrder" : "placeAskOrder"));
		$("#asset_order_asset").val(assetId);
		$("#asset_order_quantity").val(quantityQNT.toString());
		$("#asset_order_price").val(priceNQT.toString());
		$("#asset_order_fee").val(feeNQT.toString());
	});

	NRS.forms.orderAsset = function($modal) {
		var orderType = $("#asset_order_type").val();

		return {
			"requestType": orderType,
			"successMessage": $modal.find("input[name=success_message]").val().replace("__", (orderType == "placeBidOrder" ? "buy" : "sell"))
		};
	}

	NRS.forms.orderAssetComplete = function(response, data) {
		if (response.alreadyProcessed) {
			return;
		}

		if (data.requestType == "placeBidOrder") {
			var $table = $("#asset_exchange_bid_orders_table tbody");
		} else {
			var $table = $("#asset_exchange_ask_orders_table tbody");
		}

		if ($table.find("tr[data-transaction='" + String(response.transaction).escapeHTML() + "']").length) {
			return;
		}

		var $rows = $table.find("tr");

		data.quantityQNT = new BigInteger(data.quantityQNT);
		data.priceNQT = new BigInteger(data.priceNQT);
		data.totalNQT = new BigInteger(NRS.calculateOrderTotalNQT(data.quantityQNT, data.priceNQT));

		var rowToAdd = "<tr class='tentative' data-transaction='" + String(response.transaction).escapeHTML() + "' data-quantity='" + data.quantityQNT.toString().escapeHTML() + "' data-price='" + data.priceNQT.toString().escapeHTML() + "'><td>You - <strong>处理中</strong></td><td>" + NRS.formatQuantity(data.quantityQNT, NRS.currentAsset.decimals) + "</td><td>" + NRS.formatOrderPricePerWholeQNT(data.priceNQT, NRS.currentAsset.decimals) + "</td><td>" + NRS.formatAmount(data.totalNQT) + "</td></tr>";

		var rowAdded = false;

		if ($rows.length) {
			$rows.each(function() {
				var rowPrice = new BigInteger(String($(this).data("price")));

				if (data.requestType == "placeBidOrder" && data.priceNQT.compareTo(rowPrice) > 0) {
					$(this).before(rowToAdd);
					rowAdded = true;
					return false;
				} else if (data.requestType == "placeAskOrder" && data.priceNQT.compareTo(rowPrice) < 0) {
					$(this).before(rowToAdd);
					rowAdded = true;
					return false;
				}
			});
		}

		if (!rowAdded) {
			$table.append(rowToAdd);
			$table.parent().parent().removeClass("data-empty").parent().addClass("no-padding");
		}
	}

	NRS.forms.issueAsset = function($modal) {
		var data = NRS.getFormData($modal.find("form:first"));

		data.description = $.trim(data.description);

		if (!data.description) {
			return {
				"error": "描述是必填项."
			};
		} else if (!/^\d+$/.test(data.quantity)) {
			return {
				"error": "数量必须是一个整数."
			};
		} else {
			data.quantityQNT = String(data.quantity);

			if (data.decimals > 0) {
				for (var i = 0; i < data.decimals; i++) {
					data.quantityQNT += "0";
				}
			}

			delete data.quantity;

			return {
				"data": data
			};
		}
	}

	$("#asset_exchange_sidebar_group_context").on("click", "a", function(e) {
		e.preventDefault();

		var groupName = NRS.selectedContext.data("groupname");
		var option = $(this).data("option");

		if (option == "change_group_name") {
			$("#asset_exchange_change_group_name_old_display").html(groupName.escapeHTML());
			$("#asset_exchange_change_group_name_old").val(groupName);
			$("#asset_exchange_change_group_name_new").val("");
			$("#asset_exchange_change_group_name_modal").modal("show");
		}
	});

	NRS.forms.assetExchangeChangeGroupName = function($modal) {
		var oldGroupName = $("#asset_exchange_change_group_name_old").val();
		var newGroupName = $("#asset_exchange_change_group_name_new").val();

		if (!newGroupName.match(/^[a-z0-9 ]+$/i)) {
			return {
				"error": "组名只允许使用字母 数字 字符."
			};
		}

		NRS.database.update("assets", {
			"groupName": newGroupName
		}, [{
			"groupName": oldGroupName
		}], function() {
			setTimeout(function() {
				NRS.pages.asset_exchange();
				$.growl("组名更新成功.", {
					"type": "success"
				});
			}, 50);
		});

		return {
			"stop": true
		};
	}

	$("#asset_exchange_sidebar_context").on("click", "a", function(e) {
		e.preventDefault();

		var assetId = NRS.selectedContext.data("asset");
		var option = $(this).data("option");

		NRS.closeContextMenu();

		if (option == "add_to_group") {
			$("#asset_exchange_group_asset").val(assetId);

			NRS.database.select("assets", [{
				"asset": assetId
			}], function(error, asset) {
				asset = asset[0];

				$("#asset_exchange_group_title").html(String(asset.name).escapeHTML());

				NRS.database.select("assets", [], function(error, assets) {
					//NRS.database.execute("SELECT DISTINCT groupName FROM assets", [], function(groupNames) {					
					var groupNames = [];

					$.each(assets, function(index, asset) {
						if (asset.groupName && $.inArray(asset.groupName, groupNames) == -1) {
							groupNames.push(asset.groupName);
						}
					});

					assets = [];

					groupNames.sort(function(a, b) {
						if (a.toLowerCase() > b.toLowerCase()) {
							return 1;
						} else if (a.toLowerCase() < b.toLowerCase()) {
							return -1;
						} else {
							return 0;
						}
					});

					var groupSelect = $("#asset_exchange_group_group");

					groupSelect.empty();

					$.each(groupNames, function(index, groupName) {
						groupSelect.append("<option value='" + groupName.escapeHTML() + "'" + (asset.groupName && asset.groupName.toLowerCase() == groupName.toLowerCase() ? " selected='selected'" : "") + ">" + groupName.escapeHTML() + "</option>");
					});

					groupSelect.append("<option value='0'" + (!asset.groupName ? " selected='selected'" : "") + ">None</option>");
					groupSelect.append("<option value='-1'>New group</option>");

					$("#asset_exchange_group_modal").modal("show");
				});
			});
		} else if (option == "remove_from_group") {
			NRS.database.update("assets", {
				"groupName": ""
			}, [{
				"asset": assetId
			}], function() {
				setTimeout(function() {
					NRS.pages.asset_exchange();
					$.growl("资产成功从组内移除.", {
						"type": "success"
					});
				}, 50);
			});
		} else if (option == "remove_from_bookmarks") {
			var ownsAsset = false;

			if (NRS.accountInfo.unconfirmedAssetBalances) {
				$.each(NRS.accountInfo.unconfirmedAssetBalances, function(key, assetBalance) {
					if (assetBalance.asset == assetId) {
						ownsAsset = true;
						return false;
					}
				});
			}

			if (ownsAsset) {
				$.growl("资产无法移除 (您拥有它).", {
					"type": "danger"
				});
			} else {
				//todo save delteed asset ids from accountissuers
				NRS.database.delete("assets", [{
					"asset": assetId
				}], function(error, affected) {
					/*
					$.each(NRS.assets, function(key, asset) {
						if (asset.asset == assetId) {
							NRS.database.select("assets", [{
								"accountRS": asset.accountRS
							}], function(error, exists) {
								if (!error && !exists.length) {
									NRS.database.delete("assetIssuers", [{
										"account": asset.accountRS
									}]);
								}
							});
						}
					});
					*/
					setTimeout(function() {
						NRS.pages.asset_exchange();
						$.growl("该资产已经书签中移除.", {
							"type": "success"
						});
					}, 50);
				});
			}
		}
	});

	$("#asset_exchange_group_group").on("change", function() {
		var value = $(this).val();

		if (value == -1) {
			$("#asset_exchange_group_new_group_div").show();
		} else {
			$("#asset_exchange_group_new_group_div").hide();
		}
	});

	NRS.forms.assetExchangeGroup = function($modal) {
		var assetId = $("#asset_exchange_group_asset").val();
		var groupName = $("#asset_exchange_group_group").val();

		if (groupName == 0) {
			groupName = "";
		} else if (groupName == -1) {
			groupName = $("#asset_exchange_group_new_group").val();
		}

		NRS.database.update("assets", {
			"groupName": groupName
		}, [{
			"asset": assetId
		}], function() {
			setTimeout(function() {
				NRS.pages.asset_exchange();
				if (!groupName) {
					$.growl("资产已从组内移除.", {
						"type": "success"
					});
				} else {
					$.growl("资产已添加到组内.", {
						"type": "success"
					});
				}
			}, 50);
		});

		return {
			"stop": true
		};
	}

	$("#asset_exchange_group_modal").on("hidden.bs.modal", function(e) {
		$("#asset_exchange_group_new_group_div").val("").hide();
	});

	/* MY ASSETS PAGE */
	NRS.pages.my_assets = function() {
		NRS.pageLoading();

		if (NRS.accountInfo.assetBalances && NRS.accountInfo.assetBalances.length) {
			var result = {
				"assets": [],
				"bid_orders": {},
				"ask_orders": {}
			};
			var count = {
				"total_assets": NRS.accountInfo.assetBalances.length,
				"assets": 0,
				"ignored_assets": 0,
				"ask_orders": 0,
				"bid_orders": 0
			};

			for (var i = 0; i < NRS.accountInfo.assetBalances.length; i++) {
				if (NRS.accountInfo.assetBalances[i].balanceQNT == "0") {
					count.ignored_assets++;
					if (NRS.checkMyAssetsPageLoaded(count)) {
						NRS.myAssetsPageLoaded(result);
					}
					continue;
				}

				NRS.sendRequest("getAskOrderIds+", {
					"asset": NRS.accountInfo.assetBalances[i].asset,
					"limit": 1,
					"timestamp": 0
				}, function(response, input) {
					if (NRS.currentPage != "my_assets") {
						return;
					}

					if (response.askOrderIds && response.askOrderIds.length) {
						NRS.sendRequest("getAskOrder+", {
							"order": response.askOrderIds[0],
							"_extra": {
								"asset": input.asset
							}
						}, function(response, input) {
							if (NRS.currentPage != "my_assets") {
								return;
							}

							response.priceNQT = new BigInteger(response.priceNQT);

							result.ask_orders[input["_extra"].asset] = response.priceNQT;
							count.ask_orders++;
							if (NRS.checkMyAssetsPageLoaded(count)) {
								NRS.myAssetsPageLoaded(result);
							}
						});
					} else {
						result.ask_orders[input.asset] = -1;
						count.ask_orders++;
						if (NRS.checkMyAssetsPageLoaded(count)) {
							NRS.myAssetsPageLoaded(result);
						}
					}
				});

				NRS.sendRequest("getBidOrderIds+", {
					"asset": NRS.accountInfo.assetBalances[i].asset,
					"limit": 1,
					"timestamp": 0
				}, function(response, input) {
					if (NRS.currentPage != "my_assets") {
						return;
					}

					if (response.bidOrderIds && response.bidOrderIds.length) {
						NRS.sendRequest("getBidOrder+", {
							"order": response.bidOrderIds[0],
							"_extra": {
								"asset": input.asset
							}
						}, function(response, input) {
							if (NRS.currentPage != "my_assets") {
								return;
							}

							response.priceNQT = new BigInteger(response.priceNQT);

							result.bid_orders[input["_extra"].asset] = response.priceNQT;
							count.bid_orders++;
							if (NRS.checkMyAssetsPageLoaded(count)) {
								NRS.myAssetsPageLoaded(result);
							}
						});
					} else {
						result.bid_orders[input.asset] = -1;
						count.bid_orders++;
						if (NRS.checkMyAssetsPageLoaded(count)) {
							NRS.myAssetsPageLoaded(result);
						}
					}
				});

				NRS.sendRequest("getAsset+", {
					"asset": NRS.accountInfo.assetBalances[i].asset,
					"_extra": {
						"balanceQNT": NRS.accountInfo.assetBalances[i].balanceQNT
					}
				}, function(asset, input) {
					if (NRS.currentPage != "my_assets") {
						return;
					}

					asset.asset = input.asset;
					asset.balanceQNT = new BigInteger(input["_extra"].balanceQNT);
					asset.quantityQNT = new BigInteger(asset.quantityQNT);

					result.assets[count.assets] = asset;
					count.assets++;

					if (NRS.checkMyAssetsPageLoaded(count)) {
						NRS.myAssetsPageLoaded(result);
					}
				});

				if (NRS.currentPage != "my_assets") {
					return;
				}
			}
		} else {
			$("#my_assets_table tbody").empty();
			NRS.dataLoadFinished($("#my_assets_table"));
			NRS.pageLoaded();
		}
	}

	NRS.checkMyAssetsPageLoaded = function(count) {
		if ((count.assets + count.ignored_assets == count.total_assets) && (count.assets == count.ask_orders) && (count.assets == count.bid_orders)) {
			return true;
		} else {
			return false;
		}
	}

	NRS.myAssetsPageLoaded = function(result) {
		var rows = "";

		result.assets.sort(function(a, b) {
			if (a.name.toLowerCase() > b.name.toLowerCase()) {
				return 1;
			} else if (a.name.toLowerCase() < b.name.toLowerCase()) {
				return -1;
			} else {
				return 0;
			}
		});

		for (var i = 0; i < result.assets.length; i++) {
			var asset = result.assets[i];

			var lowestAskOrder = result.ask_orders[asset.asset];
			var highestBidOrder = result.bid_orders[asset.asset];

			var percentageAsset = NRS.calculatePercentage(asset.balanceQNT, asset.quantityQNT);

			if (highestBidOrder != -1) {
				var total = new BigInteger(NRS.calculateOrderTotalNQT(asset.balanceQNT, highestBidOrder, asset.decimals));
			} else {
				var total = 0;
			}

			var tentative = -1;

			if (NRS.unconfirmedTransactions.length) {
				for (var j = 0; j < NRS.unconfirmedTransactions.length; j++) {
					var unconfirmedTransaction = NRS.unconfirmedTransactions[j];

					if (unconfirmedTransaction.type == 2 && unconfirmedTransaction.subtype == 1 && unconfirmedTransaction.attachment.asset == asset.asset) {
						if (tentative == -1) {
							if (unconfirmedTransaction.recipient == NRS.account) {
								tentative = new BigInteger(unconfirmedTransaction.attachment.quantityQNT);
							} else {
								tentative = new BigInteger("-" + unconfirmedTransaction.attachment.quantityQNT);
							}
						} else {
							if (unconfirmedTransaction.recipient == NRS.account) {
								tentative = tentative.add(new BigInteger(unconfirmedTransaction.attachment.quantityQNT));
							} else {
								tentative = tentative.add(new BigInteger("-" + unconfirmedTransaction.attachment.quantityQNT));
							}
						}
					}
				}
			}

			if (highestBidOrder != -1) {
				var totalNQT = new BigInteger(NRS.calculateOrderTotalNQT(asset.balanceQNT, highestBidOrder));
			}

			var sign = "+";

			if (tentative != -1 && tentative.compareTo(BigInteger.ZERO) < 0) {
				tentative = tentative.abs();
				sign = "-";
			}

			rows += "<tr" + (tentative != -1 ? " class='tentative tentative-allow-links'" : "") + " data-asset='" + String(asset.asset).escapeHTML() + "'><td><a href='#' data-goto-asset='" + String(asset.asset).escapeHTML() + "'>" + String(asset.name).escapeHTML() + "</a></td><td class='quantity'>" + NRS.formatQuantity(asset.balanceQNT, asset.decimals) + (tentative != -1 ? " " + sign + " <span class='added_quantity'>" + NRS.formatQuantity(tentative, asset.decimals) + "</span>" : "") + "</td><td>" + NRS.formatQuantity(asset.quantityQNT, asset.decimals) + "</td><td>" + percentageAsset + "%</td><td>" + (lowestAskOrder != -1 ? NRS.formatOrderPricePerWholeQNT(lowestAskOrder, asset.decimals) : "/") + "</td><td>" + (highestBidOrder != -1 ? NRS.formatOrderPricePerWholeQNT(highestBidOrder, asset.decimals) : "/") + "</td><td>" + (highestBidOrder != -1 ? NRS.formatAmount(totalNQT) : "/") + "</td><td><a href='#' data-toggle='modal' data-target='#transfer_asset_modal' data-asset='" + String(asset.asset).escapeHTML() + "' data-name='" + String(asset.name).escapeHTML() + "' data-decimals='" + String(asset.decimals).escapeHTML() + "'>转让</a></td></tr>";
		}

		$("#my_assets_table tbody").empty().append(rows);
		NRS.dataLoadFinished($("#my_assets_table"));

		NRS.pageLoaded();
	}

	NRS.incoming.my_assets = function() {
		NRS.pages.my_assets();
	}

	$("#transfer_asset_modal").on("show.bs.modal", function(e) {
		var $invoker = $(e.relatedTarget);

		var assetId = $invoker.data("asset");
		var assetName = $invoker.data("name");
		var decimals = $invoker.data("decimals");

		$("#transfer_asset_asset").val(assetId);
		$("#transfer_asset_decimals").val(decimals);
		$("#transfer_asset_name").html(String(assetName).escapeHTML());
		$("#transer_asset_available").html("");

		var confirmedBalance = 0;
		var unconfirmedBalance = 0;

		if (NRS.accountInfo.assetBalances) {
			$.each(NRS.accountInfo.assetBalances, function(key, assetBalance) {
				if (assetBalance.asset == assetId) {
					confirmedBalance = assetBalance.balanceQNT;
					return false;
				}
			});
		}

		if (NRS.accountInfo.unconfirmedAssetBalances) {
			$.each(NRS.accountInfo.unconfirmedAssetBalances, function(key, assetBalance) {
				if (assetBalance.asset == assetId) {
					unconfirmedBalance = assetBalance.unconfirmedBalanceQNT;
					return false;
				}
			});
		}

		var availableAssetsMessage = "";

		if (confirmedBalance == unconfirmedBalance) {
			availableAssetsMessage = " - " + NRS.formatQuantity(confirmedBalance, decimals) + " 可用于转让";
		} else {
			availableAssetsMessage = " - " + NRS.formatQuantity(unconfirmedBalance, decimals) + " 可用于转让 (" + NRS.formatQuantity(confirmedBalance, decimals) + " total)";
		}

		$("#transfer_asset_available").html(availableAssetsMessage);
	});

	NRS.forms.transferAsset = function($modal) {
		var data = NRS.getFormData($modal.find("form:first"));

		if (!NRS.showedFormWarning) {
			if (NRS.settings["asset_transfer_warning"] && NRS.settings["asset_transfer_warning"] != 0) {
				if (new Big(data.quantity).cmp(new Big(NRS.settings["asset_transfer_warning"])) > 0) {
					NRS.showedFormWarning = true;
					return {
						"error": "指的数量高于 " + String(NRS.settings["asset_transfer_warning"]).escapeHTML() + ". 您确认要继续? 点击提交按钮以再次确认."
					};
				}
			}
		}

		try {
			data.quantityQNT = NRS.convertToQNT(data.quantity, data.decimals);
		} catch (e) {
			return {
				"error": "数量有误: " + e
			};
		}

		delete data.quantity;
		delete data.decimals;

		return {
			"data": data
		};
	}

	NRS.forms.transferAssetComplete = function(response, data) {
		NRS.pages.my_assets();
	}

	$("body").on("click", "a[data-goto-asset]", function(e) {
		e.preventDefault();

		var $visible_modal = $(".modal.in");

		if ($visible_modal.length) {
			$visible_modal.modal("hide");
		}

		NRS.goToAsset($(this).data("goto-asset"));
	});

	NRS.goToAsset = function(asset) {
		NRS.assetSearch = false;
		$("#asset_exchange_sidebar_search input[name=q]").val("");
		$("#asset_exchange_clear_search").hide();

		$("#asset_exchange_sidebar a.list-group-item.active").removeClass("active");
		$("#no_asset_selected, #asset_details, #no_assets_available, #no_asset_search_results").hide();
		$("#loading_asset_data").show();

		$("ul.sidebar-menu a[data-page=asset_exchange]").last().trigger("click", [{
			callback: function() {
				var assetLink = $("#asset_exchange_sidebar a[data-asset=" + asset + "]");

				if (assetLink.length) {
					assetLink.click();
				} else {
					NRS.sendRequest("getAsset", {
						"asset": asset
					}, function(response) {
						if (!response.errorCode) {
							NRS.loadAssetExchangeSidebar(function() {
								response.groupName = "";
								response.viewingAsset = true;
								NRS.loadAsset(response);
							});
						} else {
							$.growl("搜索不到.", {
								"type": "danger"
							});
						}
					});
				}
			}
		}]);
	}

	/* OPEN ORDERS PAGE */
	NRS.pages.open_orders = function() {
		var loaded = 0;

		NRS.pageLoading();

		NRS.getOpenOrders("ask", function() {
			loaded++;
			if (loaded == 2) {
				NRS.pageLoaded();
			}
		});

		NRS.getOpenOrders("bid", function() {
			loaded++;
			if (loaded == 2) {
				NRS.pageLoaded();
			}
		});
	}

	NRS.getOpenOrders = function(type, callback) {
		var uppercase = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
		var lowercase = type.toLowerCase();

		var getCurrentOrderIds = "getAccountCurrent" + uppercase + "OrderIds+";
		var orderIds = lowercase + "OrderIds";
		var getOrder = "get" + uppercase + "Order+";

		var orders = [];

		NRS.sendRequest(getCurrentOrderIds, {
			"account": NRS.account,
			"timestamp": 0
		}, function(response) {
			if (response[orderIds] && response[orderIds].length) {
				var nr_orders = 0;

				for (var i = 0; i < response[orderIds].length; i++) {
					NRS.sendRequest(getOrder, {
						"order": response[orderIds][i]
					}, function(order, input) {
						if (NRS.currentPage != "open_orders") {
							return;
						}

						order.order = input.order;
						orders.push(order);

						nr_orders++;

						if (nr_orders == response[orderIds].length) {
							var nr_orders_complete = 0;

							for (var i = 0; i < nr_orders; i++) {
								var order = orders[i];

								NRS.sendRequest("getAsset+", {
									"asset": order.asset,
									"_extra": {
										"id": i
									}
								}, function(asset, input) {
									if (NRS.currentPage != "open_orders") {
										return;
									}

									orders[input["_extra"].id].assetName = asset.name;
									orders[input["_extra"].id].decimals = asset.decimals;

									nr_orders_complete++;

									if (nr_orders_complete == nr_orders) {
										NRS.getUnconfirmedOrders(type, function(unconfirmedOrders) {
											NRS.openOrdersLoaded(orders.concat(unconfirmedOrders), lowercase, callback);
										});
									}
								});

								if (NRS.currentPage != "open_orders") {
									return;
								}
							}
						}
					});

					if (NRS.currentPage != "open_orders") {
						return;
					}
				}
			} else {
				NRS.getUnconfirmedOrders(type, function(unconfirmedOrders) {
					NRS.openOrdersLoaded(unconfirmedOrders, lowercase, callback);
				});
			}
		});
	}

	NRS.getUnconfirmedOrders = function(type, callback) {
		if (NRS.unconfirmedTransactions.length) {
			var unconfirmedOrders = [];

			for (var i = 0; i < NRS.unconfirmedTransactions.length; i++) {
				var unconfirmedTransaction = NRS.unconfirmedTransactions[i];

				if (unconfirmedTransaction.type == 2 && unconfirmedTransaction.subtype == (type == "ask" ? 2 : 3)) {
					unconfirmedOrders.push({
						"account": unconfirmedTransaction.sender,
						"asset": unconfirmedTransaction.attachment.asset,
						"assetName": "",
						"decimals": 0,
						"height": 0,
						"order": unconfirmedTransaction.transaction,
						"priceNQT": unconfirmedTransaction.attachment.priceNQT,
						"quantityQNT": unconfirmedTransaction.attachment.quantityQNT,
						"tentative": true
					})
				}
			}

			if (unconfirmedOrders.length == 0) {
				callback([]);
			} else {
				var nr_orders = 0;

				for (var i = 0; i < unconfirmedOrders.length; i++) {
					NRS.sendRequest("getAsset+", {
						"asset": unconfirmedOrders[i].asset,
						"_extra": {
							"id": i
						}
					}, function(asset, input) {
						unconfirmedOrders[input["_extra"].id].assetName = asset.name;
						unconfirmedOrders[input["_extra"].id].decimals = asset.decimals;

						nr_orders++;

						if (nr_orders == unconfirmedOrders.length) {
							callback(unconfirmedOrders);
						}
					});
				}
			}
		} else {
			callback([]);
		}
	}

	NRS.openOrdersLoaded = function(orders, type, callback) {
		if (!orders.length) {
			$("#open_" + type + "_orders_table tbody").empty();
			NRS.dataLoadFinished($("#open_" + type + "_orders_table"));

			callback();

			return;
		}

		orders.sort(function(a, b) {
			if (a.assetName.toLowerCase() > b.assetName.toLowerCase()) {
				return 1;
			} else if (a.assetName.toLowerCase() < b.assetName.toLowerCase()) {
				return -1;
			} else {
				if (a.quantity * a.price > b.quantity * b.price) {
					return 1;
				} else if (a.quantity * a.price < b.quantity * b.price) {
					return -1;
				} else {
					return 0;
				}
			}
		});

		var rows = "";

		for (var i = 0; i < orders.length; i++) {
			var completeOrder = orders[i];

			var cancelled = false;

			if (NRS.unconfirmedTransactions.length) {
				for (var j = 0; j < NRS.unconfirmedTransactions.length; j++) {
					var unconfirmedTransaction = NRS.unconfirmedTransactions[j];

					if (unconfirmedTransaction.type == 2 && unconfirmedTransaction.subtype == (type == "ask" ? 4 : 5) && unconfirmedTransaction.attachment.order == completeOrder.order) {
						cancelled = true;
						break;
					}
				}
			}

			completeOrder.priceNQT = new BigInteger(completeOrder.priceNQT);
			completeOrder.quantityQNT = new BigInteger(completeOrder.quantityQNT);
			completeOrder.totalNQT = new BigInteger(NRS.calculateOrderTotalNQT(completeOrder.quantityQNT, completeOrder.priceNQT));

			rows += "<tr data-order='" + String(completeOrder.order).escapeHTML() + "'" + (cancelled ? " class='tentative tentative-crossed'" : (completeOrder.tentative ? " class='tentative'" : "")) + "><td><a href='#' data-goto-asset='" + String(completeOrder.asset).escapeHTML() + "'>" + completeOrder.assetName.escapeHTML() + "</a></td><td>" + NRS.formatQuantity(completeOrder.quantityQNT, completeOrder.decimals) + "</td><td>" + NRS.formatOrderPricePerWholeQNT(completeOrder.priceNQT, completeOrder.decimals) + "</td><td>" + NRS.formatAmount(completeOrder.totalNQT) + "</td><td class='cancel'>" + (cancelled || completeOrder.tentative ? "/" : "<a href='#' data-toggle='modal' data-target='#cancel_order_modal' data-order='" + String(completeOrder.order).escapeHTML() + "' data-type='" + type + "'>取消</a>") + "</td></tr>";
		}

		$("#open_" + type + "_orders_table tbody").empty().append(rows);

		NRS.dataLoadFinished($("#open_" + type + "_orders_table"));
		orders = {};

		callback();
	}

	NRS.incoming.open_orders = function(transactions) {
		if (transactions || NRS.unconfirmedTransactionsChange || NRS.state.isScanning) {
			NRS.pages.open_orders();
		}
	}

	$("#cancel_order_modal").on("show.bs.modal", function(e) {
		var $invoker = $(e.relatedTarget);

		var orderType = $invoker.data("type");
		var orderId = $invoker.data("order");

		if (orderType == "bid") {
			$("#cancel_order_type").val("cancelBidOrder");
		} else {
			$("#cancel_order_type").val("cancelAskOrder");
		}

		$("#cancel_order_order").val(orderId);
	});

	NRS.forms.cancelOrder = function($modal) {
		var orderType = $("#cancel_order_type").val();

		return {
			"requestType": orderType,
			"successMessage": $modal.find("input[name=success_message]").val().replace("__", (orderType == "cancelBidOrder" ? "buy" : "sell"))
		};
	}

	NRS.forms.cancelOrderComplete = function(response, data) {
		if (response.alreadyProcessed) {
			return;
		}
		$("#open_orders_page tr[data-order=" + String(data.order).escapeHTML() + "]").addClass("tentative tentative-crossed").find("td.cancel").html("/");
	}

	return NRS;
}(NRS || {}, jQuery));