from playwright.sync_api import sync_playwright
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf-8')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900},accept_downloads=True)
 errors=[]
 page.on('pageerror', lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 assert page.locator('nav button').count()==7
 assert page.locator('.metric .value').all_text_contents()==['4','4','4','3']
 print('PASS initial counts and 7 nav')

 # create new processing activity
 page.evaluate('navigate("processing")')
 page.get_by_role('button',name='+ Add activity').click()
 page.locator('#activity-form [name="name"]').fill('Trial signup')
 page.locator('#activity-form [name="purpose"]').fill('Evaluation account registration')
 page.locator('#activity-form [name="data_categories"]').fill('Business email')
 page.locator('#activity-form [name="source_system"]').fill('Web application')
 page.locator('#activity-form [name="owner_team"]').fill('Product')
 page.get_by_role('button',name='Save activity').click()
 assert page.evaluate('state.processing_activities.length')==5
 print('PASS activity CRUD create')

 # vendor create and link
 page.evaluate('navigate("vendors")')
 page.get_by_role('button',name='+ Add vendor').click()
 page.locator('#vendor-form [name="name"]').fill('DemoDPA Inc')
 page.locator('#vendor-form [name="owner_team"]').fill('Product')
 page.locator('#vendor-form [name="activity_link"][value="ACT-005"]').check()
 page.get_by_role('button',name='Save vendor').click()
 assert page.evaluate('state.vendors.length')==5
 assert page.evaluate('state.processing_activities.find(x=>x.id==="ACT-005").vendor_ids.includes("VEN-005")')
 print('PASS vendor create/link')

 # new change
 page.evaluate('navigate("changes")')
 page.get_by_role('button',name='+ New change').last.click()
 page.locator('#change-form [name="title"]').fill('Add analytics processor')
 page.locator('#change-form [name="owner_team"]').fill('Engineering')
 page.locator('#change-form [name="activity_id"]').select_option('ACT-003')
 page.locator('#change-form [name="vendor_id"]').select_option('VEN-003')
 page.get_by_role('button',name='Create change').click()
 print('modal title after create',page.locator('.modal-head h2').text_content())
 assert page.evaluate('pendingChecks.rules.length')==4, page.evaluate('pendingChecks.rules.map(x=>x.rule_id)')
 print('PASS exactly four analytics checks')
 page.get_by_role('button',name='Record review request').click()
 assert page.evaluate('state.findings.length')==8
 assert page.evaluate('state.remediation_actions.length')==7
 page.evaluate('checkChange("CHG-003")')
 page.get_by_role('button',name='Record review request').click()
 assert page.evaluate('state.findings.length')==8
 print('PASS duplicate prevention')

 # editor requests closure
 page.evaluate('navigate("findings")')
 page.evaluate('openFinding("FND-005")')
 page.get_by_role('button',name='Request closure').click()
 page.locator('#closure-form [name="note"]').fill('Updated simulated evidence metadata following review')
 page.get_by_role('button',name='Submit to reviewer').click()
 assert page.evaluate('state.findings.find(x=>x.id==="FND-005").state')=='pending_closure'
 print('PASS editor submitted closure')
 # reviewer
 page.locator('#persona-select').select_option('reviewer')
 page.evaluate('openFinding("FND-005")')
 page.get_by_role('button',name='Review closure').click()
 page.locator('#review-form [name="reason"]').fill('Reviewed fictional metadata, not real legal evidence')
 page.get_by_role('button',name='Approve').click()
 assert page.evaluate('state.findings.find(x=>x.id==="FND-005").state')=='closed'
 print('PASS reviewer approval')

 # notices
 page.evaluate('navigate("notices")')
 page.get_by_role('button',name='+ Create draft').click()
 page.locator('#notice-form [name="mapped"][value="ACT-003"]').check()
 page.get_by_role('button',name='Save draft').click()
 assert page.evaluate('state.notice_versions.length')==3
 page.evaluate('submitNotice("NOTICE-v3")')
 page.evaluate('reviewNotice("NOTICE-v3")')
 page.locator('#notice-review [name="reason"]').fill('Reviewed synthetic purpose map only')
 page.get_by_role('button',name='Approve').click()
 assert page.evaluate('currentNotice().id')=='NOTICE-v3'
 assert page.evaluate('state.notice_versions.filter(x=>String(x.status).startsWith("current")).length')==1
 print('PASS notice draft/current reviewer approval')

 # exports
 page.evaluate('navigate("reports")')
 with page.expect_download() as dm:
  page.get_by_role('button',name='Export JSON').click()
 d=dm.value
 assert d.suggested_filename.endswith('.json')
 with page.expect_download() as dm:
  page.get_by_role('button',name='Export CSV').click()
 assert dm.value.suggested_filename.endswith('.csv')
 print('PASS CSV JSON download')

 # reset
 page.on('dialog',lambda d:d.accept())
 page.evaluate('resetDemo()')
 assert page.evaluate('[state.processing_activities.length,state.vendors.length,state.notice_versions.length,state.findings.length,state.remediation_actions.length,state.change_requests.length]')==[4,4,2,4,3,2]
 print('PASS reset original exact counts')

 # mobile
 page.set_viewport_size({'width':375,'height':812})
 page.screenshot(path=str(ROOT/'tests'/'mobile-smoke.png'),full_page=True)
 print('PASS mobile render, viewport horizontal scroll:',page.evaluate('document.documentElement.scrollWidth > innerWidth'))
 assert not errors,errors
 print('BROWSER SMOKE PASS; errors:',errors)
 browser.close()
