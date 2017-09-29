import temme, { TemmeSelector, temmeParser } from '../src/temme'
import * as path from 'path'
import * as fs from 'fs'

const stHtml = fs.readFileSync(path.resolve(__dirname, './testHtml/question-page-of-stackoverflow.html'), 'utf8')
const maigooHtml = fs.readFileSync(path.resolve(__dirname, './testHtml/maigoo-brand-page.html'), 'utf8')

test('text matching', () => {
  const selector = `
    .article_head h1{text($name, '-', _)},
    .author{text('阅读：', $count|Number, '次')}`

  // language=TEXT
  const html = `
  <div class="content">
    <div class="article_head mingren">
      <h1>张茵-东莞玖龙纸业有限公司董事长介绍</h1>
      <div class="author">阅读：13015次</div>
    </div>
  </div>`
  expect(temme(html, selector)).toEqual({
    name: '张茵',
    count: 13015,
  })
})

test('basic value capture', () => {
  const selector = `#question-header .question-hyperlink[href=$url]{$title}`

  expect(temme(stHtml, selector)).toEqual({
    url: '/questions/291978/short-description-of-the-scoping-rules',
    title: 'Short Description of the Scoping Rules?',
  })
})

test('array capture', () => {
  const selector = `.answer@answers (
    .votecell .vote-count-post{$upvote},
    .user-info .user-details>a{$userName},
  )`
  const parseResult: TemmeSelector[] = temmeParser.parse(selector)

  expect(temme(stHtml, parseResult)).toEqual({
    answers: [
      { upvote: '259', userName: 'CommunityRizwan Kassim' },
      { upvote: '111', userName: 'Brian' },
      { upvote: '58', userName: 'Antti Haapala' },
      { upvote: '18', userName: 'Jeremy Cantrell' },
      { upvote: '13', userName: 'brianray' },
      { upvote: '6', userName: 'CommunityS.Lott' },
      { upvote: '5', userName: 'bobince' }],
  })
})

test('complex example: recursive array capture, default capture, customized filters', () => {
  const selector = `.answer@ (
    .votecell .vote-count-post{$upvote},
    .post-test{$postText},
    .user-info .user-details>a{$userName},
    .comment@comments (
      .comment-score{$score},
      .comment-copy{$content|substring10},
      .comment-user[href=$userUrl]{$userName},
      .comment-data span[title=$data],
    ),
  )`

  expect(temme(stHtml, selector, {
    substring10(this: string) {
      return this.substring(0, 10)
    },
  })).toEqual([
    {
      comments: [
        { content: 'U did not ', score: '1', userName: 'Lakshman Prasad', userUrl: '/users/55562/lakshman-prasad' },
        { content: 'my intuiti', score: '1', userName: 'Conrad.Dean', userUrl: '/users/656833/conrad-dean' },
        { content: 'As a cavea', score: '22', userName: 'Peter Gibson', userUrl: '/users/66349/peter-gibson' },
        { content: 'Actually @', score: '7', userName: 'martineau', userUrl: '/users/355230/martineau' },
        { content: '@Jonathan:', score: '2', userName: 'martineau', userUrl: '/users/355230/martineau' },
      ],
      upvote: '259',
      userName: 'CommunityRizwan Kassim',
    },
    { comments: [], upvote: '111', userName: 'Brian' },
    { comments: [], upvote: '58', userName: 'Antti Haapala' },
    { comments: [], upvote: '18', userName: 'Jeremy Cantrell' },
    {
      comments: [
        { content: 'This is gr', score: '3', userName: 'kiril', userUrl: '/users/1919237/kiril' },
      ],
      upvote: '13',
      userName: 'brianray',
    },
    {
      comments: [
        { content: 'This is ou', score: '4', userName: 'Brian', userUrl: '/users/9493/brian' },
        { content: 'I\'m sorry,', score: '', userName: 'Rizwan Kassim', userUrl: '/users/35335/rizwan-kassim' },
      ],
      upvote: '6',
      userName: 'CommunityS.Lott',
    },
    { comments: [], upvote: '5', userName: 'bobince' },
  ])
})

test('complex case: multiple parent-refs', () => {
  const selector = `.brandinfo .info >li@|pack(
      &{text('电话：', $phone|split(','))},
      &{text('品牌创立时间：', $foundTime)},
      &{text('品牌发源地：', $origination)},
      &{html($presidentUrl|extractPresidentUrl)},
      &{text('品牌广告词：', $adText)},
      script[language]{html($officialWebsite|extractUrl)},
    )`

  const filters = {
    extractUrl(this: string) {
      const reg = /">(.*)<\/a>/
      const result = this.match(reg)
      return result && result[1]
    },

    extractPresidentUrl(this: string) {
      if (this.indexOf('首席执行官') !== -1
        || this.indexOf('总裁') !== -1
        || this.indexOf('董事长') !== -1
        || this.indexOf('CEO') !== -1) {
        const [_, presidentUrl]: string[] = this.match(/href="(.*)"/) || []
        return presidentUrl
      }
    }
  }

  expect(temme(maigooHtml, selector, filters))
    .toEqual({
      phone: ['400-100-5678'],
      foundTime: '2010年',
      officialWebsite: 'http://www.mi.com/',
      origination: '北京市',
      presidentUrl: 'http://www.maigoo.com/mingren/848.html',
      adText: '小米，为发烧而生',
    })
})
