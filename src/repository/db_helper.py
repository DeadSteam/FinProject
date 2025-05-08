from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine, AsyncSession, async_sessionmaker

from src.core.config import settings


class DBHelper:
    def __init__(
        self,
        url: str,
        echo: bool = False,
        echo_pool: bool = False,
        pool_size: int = 5,
        max_overflow: int = 10,
    ):
        self.engine: AsyncEngine = create_async_engine(
            url,
            echo=echo,
            echo_pool=echo_pool,
            pool_size=pool_size,
            max_overflow=max_overflow,
        )
        self.session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
            bind=self.engine,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

    async def dispose(self):
        await self.engine.dispose()

    async def session_getter(self):
        async with self.session_factory as session:
            yield session

users_db_helper = DBHelper(
    url=settings.USERS_DATABASE.URL,
    echo=settings.USERS_DATABASE.ECHO,
    echo_pool=settings.USERS_DATABASE.ECHO_POOL,
    pool_size=settings.USERS_DATABASE.POOL_SIZE,
    max_overflow=settings.USERS_DATABASE.MAX_OVERFLOW,
)
finances_db_helper = DBHelper(
    url=settings.FINANCE_DATABASE.URL,
    echo=settings.FINANCE_DATABASE.ECHO,
    echo_pool=settings.FINANCE_DATABASE.ECHO_POOL,
    pool_size=settings.FINANCE_DATABASE.POOL_SIZE,
    max_overflow=settings.FINANCE_DATABASE.MAX_OVERFLOW,
) 