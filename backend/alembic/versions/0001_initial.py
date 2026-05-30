"""Initial migration — creates all tables."""
from alembic import op
import sqlalchemy as sa

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('depots',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=10), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('location_lat', sa.Numeric(precision=10, scale=7), nullable=False),
        sa.Column('location_lng', sa.Numeric(precision=10, scale=7), nullable=False),
        sa.Column('polygon_geojson', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index('ix_depots_id', 'depots', ['id'])

    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=100), nullable=False),
        sa.Column('role', sa.Enum('driver','conductor','depot_manager','control_operator','admin', name='userrole'), nullable=False),
        sa.Column('depot_id', sa.Integer(), nullable=True),
        sa.Column('phone', sa.String(length=15), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['depot_id'], ['depots.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_username', 'users', ['username'])

    op.create_table('vehicles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reg_no', sa.String(length=20), nullable=False),
        sa.Column('depot_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('idle','on_duty','maintenance','off', name='vehiclestatus'), nullable=False, server_default='idle'),
        sa.Column('model', sa.String(length=50), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=True, server_default=sa.text('40')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['depot_id'], ['depots.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reg_no'),
    )
    op.create_index('ix_vehicles_id', 'vehicles', ['id'])
    op.create_index('ix_vehicles_reg_no', 'vehicles', ['reg_no'])

    op.create_table('gps_pings',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('vehicle_id', sa.Integer(), nullable=False),
        sa.Column('ts', sa.DateTime(timezone=True), nullable=False),
        sa.Column('lat', sa.Numeric(precision=10, scale=7), nullable=False),
        sa.Column('lng', sa.Numeric(precision=10, scale=7), nullable=False),
        sa.Column('speed_kmh', sa.Numeric(precision=5, scale=2), nullable=True, server_default=sa.text('0')),
        sa.Column('ignition_on', sa.Boolean(), nullable=True, server_default=sa.text('true')),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_gps_pings_id', 'gps_pings', ['id'])
    op.create_index('ix_gps_pings_ts', 'gps_pings', ['ts'])
    op.create_index('idx_gps_vehicle_ts', 'gps_pings', ['vehicle_id', sa.text('ts DESC')])

    op.create_table('incidents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('breakdown','accident','complaint','other', name='incidenttype'), nullable=False),
        sa.Column('severity', sa.Enum('P1','P2','P3', name='incidentseverity'), nullable=False),
        sa.Column('status', sa.Enum('open','acknowledged','in_progress','resolved','closed', name='incidentstatus'), nullable=False, server_default='open'),
        sa.Column('raised_by', sa.Integer(), nullable=False),
        sa.Column('assigned_to', sa.Integer(), nullable=True),
        sa.Column('vehicle_id', sa.Integer(), nullable=True),
        sa.Column('depot_id', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('photo_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sla_deadline', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id']),
        sa.ForeignKeyConstraint(['depot_id'], ['depots.id']),
        sa.ForeignKeyConstraint(['raised_by'], ['users.id']),
        sa.ForeignKeyConstraint(['vehicle_id'], ['vehicles.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_incidents_id', 'incidents', ['id'])
    op.create_index('idx_incident_status_depot', 'incidents', ['status', 'depot_id'])

    op.create_table('incident_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('incident_id', sa.Integer(), nullable=False),
        sa.Column('ts', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('actor_id', sa.Integer(), nullable=False),
        sa.Column('from_status', sa.String(length=20), nullable=True),
        sa.Column('to_status', sa.String(length=20), nullable=False),
        sa.Column('note', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id']),
        sa.ForeignKeyConstraint(['incident_id'], ['incidents.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_incident_events_id', 'incident_events', ['id'])
    op.create_index('ix_incident_events_incident_id', 'incident_events', ['incident_id'])

    op.create_table('notices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('audience_json', sa.Text(), nullable=False, server_default='{"type":"all"}'),
        sa.Column('publish_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('requires_ack', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notices_id', 'notices', ['id'])

    op.create_table('notice_reads',
        sa.Column('notice_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('acked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['notice_id'], ['notices.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('notice_id', 'user_id'),
    )


def downgrade() -> None:
    op.drop_table('notice_reads')
    op.drop_table('notices')
    op.drop_table('incident_events')
    op.drop_table('incidents')
    op.drop_table('gps_pings')
    op.drop_table('vehicles')
    op.drop_table('users')
    op.drop_table('depots')
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS vehiclestatus")
    op.execute("DROP TYPE IF EXISTS incidenttype")
    op.execute("DROP TYPE IF EXISTS incidentseverity")
    op.execute("DROP TYPE IF EXISTS incidentstatus")
