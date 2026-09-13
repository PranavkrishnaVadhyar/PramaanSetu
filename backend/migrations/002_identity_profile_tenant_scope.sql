-- Apply after 001 on databases where identity_profiles already exists.
ALTER TABLE identity_profiles
    ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id);

-- Existing demo profiles cannot safely be assigned to a tenant; remove them
-- before enforcing the required ownership boundary. They contain only mock
-- data and can be recreated by the authenticated verification endpoint.
DELETE FROM identity_profiles WHERE owner_user_id IS NULL;

ALTER TABLE identity_profiles
    ALTER COLUMN owner_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_identity_profiles_owner_user_id
    ON identity_profiles(owner_user_id);
