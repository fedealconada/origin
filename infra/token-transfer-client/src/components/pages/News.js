import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

import { fetchNews } from '@/actions/news'
import {
  getNews,
  getIsLoaded as getNewsIsLoaded,
  getIsLoading as getNewsIsLoading
} from '@/reducers/news'
import NewsCard from '@/components/NewsCard'

const News = props => {
  useEffect(() => {
    if (!props.newsIsLoaded) {
      props.fetchNews()
    }
  }, [])

  if (props.newsIsLoading || props.error) return null

  return (
    <div>
      <h1 className="mb-2">News</h1>
      <hr />
      <div className="row">
        {props.news.slice(0, 9).map(item => (
          <div className="col-12 col-lg-6 col-xl-4" key={item.title}>
            <NewsCard
              {...item}
              description={item.description.substr(0, 120) + '...'}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const mapStateToProps = ({ news }) => {
  return {
    news: getNews(news),
    newsIsLoading: getNewsIsLoading(news),
    newsIsLoaded: getNewsIsLoaded(news)
  }
}

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      fetchNews: fetchNews
    },
    dispatch
  )

export default connect(mapStateToProps, mapDispatchToProps)(News)
