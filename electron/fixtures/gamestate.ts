// Small hand-made gamestate in the shape of a save converted with `rakaly json`.
// Own test data: no real Paradox save in the repo. Numbers loosely follow the Belgium
// example from docs/save-structuur.md so rule tests read naturally.

export const GOODS_TXT = `
ammunition = {
	cost = 50
}
paper = {
	texture = "x"
	cost = 30
}
explosives = {
	cost = 50
}
tools = {
	cost = 40
}
`;

export function makeGamestate(overrides: { countryPatch?: Record<string, unknown> } = {}) {
	return {
		meta_data: { version: '1.15.1', game_date: '1848.9.16', name: 'Belgium', ironman: false },
		date: '1848.9.16.6',
		player_manager: { database: { '0': { user: 'player', country: 25 } } },
		country_manager: {
			database: {
				'29': { definition: 'NET' },
				'25': {
					definition: 'BEL',
					tax_level: 'very_high',
					import_tariffs: { '1': { level: 'high_subventions' } },
					export_tariffs: { '3': { level: 'low_tariffs' } },
					states: [477, 476],
					construction_paused: true,
					government_queue: {
						construction_elements: [
							{ type: 'building_paper_mill', state: 476 },
							{ type: 'building_port', state: 477 }
						]
					},
					private_queue: { construction_elements: [{ type: 'building_logging_camp', state: 477 }] },
					budget: {
						weekly_income: [0, 20000, 12144],
						weekly_expenses: [0, 18000, 11636],
						money: 0,
						principal: 2023328,
						credit: 4614425,
						investment_pool: 166194,
						country_building_budget: {
							expenses: { construction_goods: { values: { building_construction_sector: 11277 } } }
						},
						current_price_report: {
							goods: {
								'0': { value: 87.5 },
								'1': { value: 46.7 },
								'2': { value: 122.5 },
								'3': { value: 12.5 }
							}
						}
					},
					// Ring buffer with index 2: the newest value is at position 1, not at the end.
					gdp: { channels: { '0': { index: 2, values: [3500000, 3600000, 3100000] } } },
					avgsoltrend: { channels: { '0': { index: 3, values: [8.1, 8.5, 8.77] } } },
					literacy: { channels: { '0': { index: 1, values: [0.4216] } } },
					pop_statistics: {
						population_lower_strata: 4500000,
						population_middle_strata: 500000,
						population_upper_strata: 61265,
						population_radicals: 1222155,
						population_loyalists: 33692,
						population_unemployed_workforce: 168084
					},
					...overrides.countryPatch
				}
			}
		},
		states: {
			database: {
				'477': {
					region: 'STATE_FLANDERS',
					country: 25,
					trade_capacity: 64,
					trade_capacity_usage: 64,
					// + export, − import (spike S6)
					trade: { goods: { '1': { value: 6 }, '3': { value: -4 } } },
					infrastructure: 124,
					infrastructure_usage: 68,
					pop_statistics: {
						population_lower_strata: 2800000,
						population_middle_strata: 28061,
						population_upper_strata: 0,
						population_unemployed_workforce: 99192
					}
				},
				'479': { region: 'STATE_GELRE', country: 29 },
				'476': {
					region: 'STATE_GELRE',
					country: 25,
					trade: { goods: { '1': { value: 2 } } },
					infrastructure: 32,
					infrastructure_usage: 12,
					pop_statistics: {
						population_lower_strata: 247030,
						population_middle_strata: 0,
						population_upper_strata: 0,
						population_unemployed_workforce: 4322
					}
				}
			}
		},
		market_manager: {
			world_market: { price_trend: { channels: { '1': { index: 1, values: [41.04] } } } }
		},
		treaty_article_manager: {
			database: {
				'1': { article: 'trade_privilege', source_country: 25, target_country: 29 },
				'2': { article: 'trade_privilege', source_country: 29, target_country: 25 },
				'3': { article: 'guarantee_independence', source_country: 25, target_country: 1 }
			}
		},
		building_manager: {
			database: {
				'90': {
					building: 'building_trade_center',
					state: 477,
					levels: 3,
					staffing: 3,
					trade_revenue: 100,
					tariffs: 20,
					subventions: 5,
					profit_after_reserves: 10
				},
				'1': {
					building: 'building_paper_mill',
					state: 477,
					output_goods: { goods: { '1': { value: 12 } } },
					levels: 1,
					staffing: 1,
					profit_after_reserves: 1615
				},
				'2': {
					building: 'building_explosives_factory',
					state: 477,
					levels: 1,
					staffing: 0.03,
					profit_after_reserves: -18
				},
				'3': {
					building: 'building_government_administration',
					state: 477,
					levels: 5,
					staffing: 5,
					profit_after_reserves: -6465,
					input_goods_shortage: 0.19
				},
				'4': {
					building: 'building_construction_sector',
					state: 477,
					levels: 3,
					staffing: 3,
					profit_after_reserves: 0
				},
				'5': {
					building: 'building_iron_mine',
					state: 999,
					levels: 8,
					staffing: 8,
					profit_after_reserves: 2000
				}
			}
		},
		interest_groups: {
			database: {
				'88': {
					country: 25,
					definition: 'ig_intelligentsia',
					approval: 5,
					clout: 0.417,
					influence_type: 'influential'
				},
				'89': {
					country: 25,
					definition: 'ig_trade_unions',
					approval: -9,
					clout: 0,
					influence_type: 'neutral'
				},
				'90': {
					country: 7,
					definition: 'ig_landowners',
					approval: -10,
					clout: 0.5,
					influence_type: 'powerful'
				}
			}
		},
		laws: {
			database: {
				'1': { law: 'law_monarchy', country: 25, active: true },
				'2': { law: 'law_free_trade', country: 25 },
				'3': { law: 'law_no_police', country: 25, active: true }
			}
		},
		journal_entry_manager: {
			database: {
				'1': {
					type: 'je_tutorial_grow_gdp',
					country: 25,
					active: true,
					date_added: '1839.3.4',
					baseline_value: 3916769.44,
					goal_value: 4895961.8
				},
				'2': { type: 'je_done', country: 25, date_added: '1837.1.1' },
				'3': { type: 'je_other_country', country: 29, active: true, date_added: '1837.1.1' },
				'4': 'none'
			}
		}
	};
}
